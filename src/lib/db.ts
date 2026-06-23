/**
 * db.ts — Drizzle ORM client backed by AWS Aurora PostgreSQL.
 *
 * Credentials strategy:
 * - On Vercel runtime: awsCredentialsProvider uses the injected OIDC token.
 * - In v0 sandbox / local dev: VERCEL_OIDC_TOKEN in .env.development.local.
 *
 * CRITICAL: credentials and signer MUST be built inside the `password` callback
 * so they are created fresh on every connection attempt — not once at module
 * load. The OIDC token in .env.development.local expires quickly; stale tokens
 * cause "Connection terminated due to connection timeout" 500 errors.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import { fromWebToken } from "@aws-sdk/credential-providers";
import { awsCredentialsProvider } from "@vercel/functions/oidc";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "./schema";

/** Build a fresh credentials provider every time — reads VERCEL_OIDC_TOKEN from
 *  process.env at call time so hot-reloads and token refreshes work correctly. */
function buildCredentials() {
  const token = process.env.VERCEL_OIDC_TOKEN;
  if (token) {
    return fromWebToken({
      roleArn: process.env.AWS_ROLE_ARN!,
      webIdentityToken: token,
      clientConfig: { region: process.env.AWS_REGION },
    });
  }
  // On Vercel production/preview runtime — token is injected by the platform
  return awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN!,
    clientConfig: { region: process.env.AWS_REGION },
  });
}

/** Returns a fresh IAM auth token for every new pg connection. */
async function getPassword(): Promise<string> {
  const signer = new Signer({
    credentials: buildCredentials(),   // fresh credentials each call
    region: process.env.AWS_REGION!,
    hostname: process.env.PGHOST!,
    username: process.env.PGUSER ?? "postgres",
    port: 5432,
  });
  return signer.getAuthToken();
}

// Singleton pool — safe across hot-reloads in dev and serverless cold-starts
declare global {
  // eslint-disable-next-line no-var
  var _auroraPool: Pool | undefined;
}

const pool =
  global._auroraPool ??
  new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE ?? "postgres",
    port: 5432,
    user: process.env.PGUSER ?? "postgres",
    password: getPassword,   // called fresh on every new connection
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
  });

if (process.env.NODE_ENV !== "production") {
  global._auroraPool = pool;
}

attachDatabasePool(pool);

export const db = drizzle(pool, { schema });
// Export the raw pool so auth.ts can pass it directly to Better Auth
export { pool as auroraPool };
