import { Pool, ClientBase } from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import { awsCredentialsProvider } from "@vercel/functions/oidc";
import { fromWebToken } from "@aws-sdk/credential-providers";
import { attachDatabasePool } from "@vercel/functions";

/**
 * Credential strategy:
 *  - On Vercel (production/preview): awsCredentialsProvider uses the Vercel
 *    OIDC token automatically via the integration.
 *  - Locally with .env.aurora.local pulled: VERCEL_OIDC_TOKEN is present so
 *    we use fromWebToken to assume the same role.
 */
function buildCredentials() {
  const oidcToken = process.env.VERCEL_OIDC_TOKEN;
  const roleArn = process.env.AWS_ROLE_ARN!;
  const region = process.env.AWS_REGION!;

  if (oidcToken) {
    // Works both locally (pulled .env.aurora.local) and on Vercel
    return fromWebToken({
      roleArn,
      webIdentityToken: oidcToken,
      clientConfig: { region },
    });
  }

  // Fallback: Vercel's native OIDC provider (no explicit token needed at runtime)
  return awsCredentialsProvider({
    roleArn,
    clientConfig: { region },
  });
}

const signer = new Signer({
  credentials: buildCredentials(),
  region: process.env.AWS_REGION!,
  hostname: process.env.PGHOST!,
  username: process.env.PGUSER || "postgres",
  port: 5432,
});

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE || "postgres",
  port: parseInt(process.env.PGPORT || "5432"),
  user: process.env.PGUSER || "postgres",
  // IAM token is valid for 15 minutes; signer fetches a fresh one each call
  password: () => signer.getAuthToken(),
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

attachDatabasePool(pool);

/** Single-statement query helper */
export async function auroraQuery(text: string, params?: unknown[]) {
  return pool.query(text, params);
}

/** Multi-statement / transaction helper */
export async function withAuroraConnection<T>(
  fn: (client: ClientBase) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
