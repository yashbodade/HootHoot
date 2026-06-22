/**
 * dynamo.ts — Amazon DynamoDB single-table data layer for Hoot-Hoot.
 *
 * WHY DYNAMODB (a deliberate, defensible choice):
 * - Every access pattern here is key-value: "get user by email", "get session
 *   by token", "scores for a game", "a user's attempt history". These are
 *   single-digit-millisecond point reads / Queries — DynamoDB's core strength.
 * - DynamoDB uses STATELESS HTTPS via the AWS SDK. There is NO connection pool
 *   to exhaust or drop — which is exactly what broke the Aurora `pg` pool in the
 *   serverless/preview sandbox ("Connection terminated due to connection
 *   timeout"). DynamoDB is reliable under serverless cold-starts and scale.
 * - SINGLE-TABLE DESIGN: the integration provisions one table with a generic
 *   composite key (PK + SK). We overload it to hold every entity type, the
 *   idiomatic DynamoDB pattern that keeps related items co-located and queries
 *   to a single round-trip.
 *
 * AUTH: IAM via OIDC, scoped to the DynamoDB integration role. On Vercel the
 * token is injected + auto-refreshed by the runtime (awsCredentialsProvider);
 * in the v0 sandbox / local dev we use VERCEL_OIDC_TOKEN (fromWebToken).
 * Credentials are built per request so a refreshed token is always used.
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { fromWebToken } from "@aws-sdk/credential-providers";
import { awsCredentialsProvider } from "@vercel/functions/oidc";

// The integration provisions ONE table with composite PK/SK. Use it for everything.
export const TABLE_NAME = process.env.AWS_DYNAMODB_DYNAMODB_TABLE_NAME!;
export const PK = process.env.AWS_DYNAMODB_DYNAMODB_TABLE_PARTITION_KEY || "PK";
export const SK = process.env.AWS_DYNAMODB_DYNAMODB_TABLE_SORT_KEY || "SK";

const REGION = process.env.AWS_DYNAMODB_AWS_REGION || process.env.AWS_REGION;
const ROLE_ARN = process.env.AWS_DYNAMODB_AWS_ROLE_ARN || process.env.AWS_ROLE_ARN;

function buildCredentials() {
  const token = process.env.VERCEL_OIDC_TOKEN;
  if (token) {
    // v0 sandbox / local dev — explicit web-identity token exchange.
    return fromWebToken({
      roleArn: ROLE_ARN!,
      webIdentityToken: token,
      clientConfig: { region: REGION },
    });
  }
  // Vercel runtime — token injected and auto-refreshed by the platform.
  return awsCredentialsProvider({
    roleArn: ROLE_ARN!,
    clientConfig: { region: REGION },
  });
}

/** Fresh DocumentClient per call — cheap, stateless, always uses a valid token. */
export function getDocClient(): DynamoDBDocumentClient {
  const base = new DynamoDBClient({ region: REGION, credentials: buildCredentials() });
  return DynamoDBDocumentClient.from(base, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

// ── Single-table key helpers (entity prefixes keep item types separated) ──
export const keys = {
  user: (email: string) => ({ [PK]: `USER#${email.toLowerCase()}`, [SK]: "PROFILE" }),
  session: (token: string) => ({ [PK]: `SESSION#${token}`, [SK]: "SESSION" }),
  // best score per user per game
  scoreItem: (gameId: string, userId: string) => ({ [PK]: `GAME#${gameId}`, [SK]: `USER#${userId}` }),
  scoreQuery: (gameId: string) => `GAME#${gameId}`,
  // arena practice leaderboard — best attempt per user, all under one partition
  arenaItem: (userId: string) => ({ [PK]: "ARENA#LEADERBOARD", [SK]: `USER#${userId}` }),
  arenaPartition: () => "ARENA#LEADERBOARD",
  // a user's full attempt history
  attemptItem: (userId: string, createdAt: string, id: string) => ({
    [PK]: `USER#${userId}`,
    [SK]: `ATTEMPT#${createdAt}#${id}`,
  }),
  attemptQueryPartition: (userId: string) => `USER#${userId}`,
  attemptSkPrefix: () => "ATTEMPT#",
};

export { GetCommand, PutCommand, QueryCommand, DeleteCommand };
