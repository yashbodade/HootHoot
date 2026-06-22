/**
 * auth-dynamo.ts — custom, dependency-light authentication on Amazon DynamoDB.
 *
 * Tables:
 *  - hoothoot_users:    PK = email (string)           → one item per account
 *  - hoothoot_sessions: PK = token (string), TTL set  → auto-expiring sessions
 *
 * Passwords are hashed with scrypt from Node's built-in `crypto` (no external
 * dependency, memory-hard, salted per user). Sessions are opaque random tokens
 * stored server-side in DynamoDB and referenced by an httpOnly cookie.
 */
import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  getDocClient,
  TABLES,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from "./dynamo";

export const SESSION_COOKIE = "hoothoot_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type Role = "student" | "company";

export interface DynamoUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  image?: string | null;
  companyName?: string | null;
  passwordHash: string; // "salt:hash" hex
  createdAt: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  email: string;
  expiresAt: number; // epoch seconds (DynamoDB TTL)
}

export type PublicUser = Omit<DynamoUser, "passwordHash">;

// ── Password hashing ──────────────────────────────────────────
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const testBuf = scryptSync(password, salt, 64);
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf);
}

export function toPublicUser(u: DynamoUser): PublicUser {
  const { passwordHash: _passwordHash, ...rest } = u;
  return rest;
}

// ── User operations ───────────────────────────────────────────
export async function getUserByEmail(email: string): Promise<DynamoUser | null> {
  const doc = getDocClient();
  const res = await doc.send(
    new GetCommand({ TableName: TABLES.users, Key: { email: email.toLowerCase() } })
  );
  return (res.Item as DynamoUser) ?? null;
}

export async function createUser(params: {
  email: string;
  password: string;
  name: string;
  role: Role;
  companyName?: string | null;
}): Promise<{ user: PublicUser | null; error: string | null }> {
  const email = params.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return { user: null, error: "Please enter a valid email address." };
  if (params.password.length < 6) return { user: null, error: "Password must be at least 6 characters." };
  if (!params.name.trim()) return { user: null, error: "Please enter your name." };

  const existing = await getUserByEmail(email);
  if (existing) return { user: null, error: "An account with this email already exists." };

  const user: DynamoUser = {
    id: randomBytes(12).toString("hex"),
    email,
    name: params.name.trim(),
    role: params.role,
    image: null,
    companyName: params.companyName ?? null,
    passwordHash: hashPassword(params.password),
    createdAt: new Date().toISOString(),
  };

  const doc = getDocClient();
  // ConditionExpression guards against a race creating two accounts.
  await doc.send(
    new PutCommand({
      TableName: TABLES.users,
      Item: user,
      ConditionExpression: "attribute_not_exists(email)",
    })
  );

  return { user: toPublicUser(user), error: null };
}

export async function authenticate(
  email: string,
  password: string
): Promise<{ user: PublicUser | null; error: string | null }> {
  const user = await getUserByEmail(email.trim().toLowerCase());
  if (!user) return { user: null, error: "Invalid email or password." };
  if (!verifyPassword(password, user.passwordHash))
    return { user: null, error: "Invalid email or password." };
  return { user: toPublicUser(user), error: null };
}

export async function getUserById(id: string, email: string): Promise<DynamoUser | null> {
  // We key users by email; the session stores both id and email, so this is a
  // direct point read (no GSI needed for the common path).
  const user = await getUserByEmail(email);
  if (user && user.id === id) return user;
  return null;
}

// ── Session operations ────────────────────────────────────────
export async function createSession(user: PublicUser): Promise<SessionRecord> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const record: SessionRecord = { token, userId: user.id, email: user.email, expiresAt };

  const doc = getDocClient();
  await doc.send(new PutCommand({ TableName: TABLES.sessions, Item: record }));
  return record;
}

export async function getSession(token: string): Promise<SessionRecord | null> {
  if (!token) return null;
  const doc = getDocClient();
  const res = await doc.send(
    new GetCommand({ TableName: TABLES.sessions, Key: { token } })
  );
  const session = res.Item as SessionRecord | undefined;
  if (!session) return null;
  if (session.expiresAt * 1000 < Date.now()) {
    // Expired but TTL hasn't swept it yet — treat as gone.
    await deleteSession(token).catch(() => {});
    return null;
  }
  return session;
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  const doc = getDocClient();
  await doc.send(new DeleteCommand({ TableName: TABLES.sessions, Key: { token } }));
}

export { SESSION_TTL_SECONDS };
