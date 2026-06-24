/**
 * cognito-server.ts — SERVER-ONLY Cognito JWT verification.
 *
 * Verifies the Cognito ID token that the client stores in an HttpOnly cookie
 * named `id_token`. Returns a typed CognitoUser or null.
 *
 * Does NOT import aws-amplify (browser SDK) — uses plain fetch + crypto
 * to verify the JWT against the Cognito JWKS endpoint so this module is
 * safe to run in Node.js edge/serverless contexts.
 */
import "server-only";
import { cookies } from "next/headers";

const REGION = process.env.NEXT_PUBLIC_AWS_COGNITO_REGION ?? process.env.AWS_REGION ?? "us-east-1";
const USER_POOL_ID = process.env.NEXT_PUBLIC_AWS_USER_POOLS_ID!;
const CLIENT_ID = process.env.NEXT_PUBLIC_AWS_USER_POOLS_WEB_CLIENT_ID!;

const JWKS_URL = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;

export interface CognitoUser {
  /** Cognito sub — stable unique user ID (use this as DB userId) */
  sub: string;
  email: string;
  name: string;
  email_verified: boolean;
  /** Raw decoded payload */
  raw: Record<string, unknown>;
}

// ── JWKS cache ────────────────────────────────────────────────────────────────
let jwksCache: { keys: JWK[]; fetchedAt: number } | null = null;

interface JWK {
  kid: string;
  kty: string;
  use: string;
  n: string;
  e: string;
  alg: string;
}

async function getJwks(): Promise<JWK[]> {
  const now = Date.now();
  // Cache for 1 hour
  if (jwksCache && now - jwksCache.fetchedAt < 60 * 60 * 1000) {
    return jwksCache.keys;
  }
  const res = await fetch(JWKS_URL, { next: { revalidate: 3600 } });
  const data = await res.json();
  jwksCache = { keys: data.keys, fetchedAt: now };
  return data.keys;
}

// ── Base64url helpers ─────────────────────────────────────────────────────────
function base64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64urlToArrayBuffer(str: string): ArrayBuffer {
  return base64urlDecode(str).buffer as ArrayBuffer;
}

// ── JWT verification ──────────────────────────────────────────────────────────
async function verifyJWT(token: string): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode header to get kid
  let header: { kid: string; alg: string };
  try {
    header = JSON.parse(atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }

  // Get matching JWK
  const keys = await getJwks();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return null;

  // Import the public key
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg, use: jwk.use },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
  } catch {
    return null;
  }

  // Verify signature
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64urlToArrayBuffer(signatureB64);

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signature,
    signingInput
  );
  if (!valid) return null;

  // Decode payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }

  // Validate expiry
  if (payload.exp && typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) {
    return null;
  }

  // Validate issuer
  const expectedIssuer = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
  if (payload.iss !== expectedIssuer) return null;

  // Validate audience (client_id)
  if (payload.aud !== CLIENT_ID && payload.client_id !== CLIENT_ID) return null;

  return payload;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get the currently authenticated user from the request cookies.
 * Returns null if not authenticated or token is invalid/expired.
 */
export async function getCurrentUser(): Promise<CognitoUser | null> {
  try {
    const cookieStore = await cookies();
    const idToken = cookieStore.get("cognito_id_token")?.value;

    if (!idToken) return null;

    const payload = await verifyJWT(idToken);
    if (!payload) return null;

    return {
      sub: payload.sub as string,
      email: (payload.email as string) ?? "",
      name: (payload.name as string) ?? (payload.email as string) ?? "Player",
      email_verified: (payload.email_verified as boolean) ?? false,
      raw: payload,
    };
  } catch {
    return null;
  }
}

/**
 * Get user from a raw Authorization: Bearer <token> header.
 * Used by API routes that receive the token directly.
 */
export async function getUserFromBearer(authHeader: string | null): Promise<CognitoUser | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = await verifyJWT(token);
  if (!payload) return null;
  return {
    sub: payload.sub as string,
    email: (payload.email as string) ?? "",
    name: (payload.name as string) ?? (payload.email as string) ?? "Player",
    email_verified: (payload.email_verified as boolean) ?? false,
    raw: payload,
  };
}
