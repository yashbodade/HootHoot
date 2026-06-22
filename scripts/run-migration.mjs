/**
 * Runs SQL migration against Aurora PostgreSQL using OIDC-based IAM auth.
 * Uses VERCEL_OIDC_TOKEN + AWS_ROLE_ARN to assume the correct AWS role,
 * then gets an RDS auth token for the IAM-authenticated database connection.
 *
 * Usage:
 *   node --env-file=.env.aurora.local scripts/run-migration.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import { fromWebToken } from "@aws-sdk/credential-providers";

const { Pool } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Validate required env vars
const required = ["PGHOST", "AWS_REGION", "AWS_ROLE_ARN", "PGUSER", "PGDATABASE", "VERCEL_OIDC_TOKEN"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[migration] Missing required env var: ${key}`);
    process.exit(1);
  }
}

console.log("[migration] Env vars validated.");
console.log(`[migration] PGHOST:    ${process.env.PGHOST}`);
console.log(`[migration] PGUSER:    ${process.env.PGUSER}`);
console.log(`[migration] PGDATABASE: ${process.env.PGDATABASE}`);
console.log(`[migration] AWS_REGION: ${process.env.AWS_REGION}`);

// Build credentials from the OIDC web identity token (Vercel federation)
const credentials = fromWebToken({
  roleArn: process.env.AWS_ROLE_ARN,
  webIdentityToken: process.env.VERCEL_OIDC_TOKEN,
  clientConfig: { region: process.env.AWS_REGION },
});

const signer = new Signer({
  credentials,
  region: process.env.AWS_REGION,
  hostname: process.env.PGHOST,
  username: process.env.PGUSER,
  port: 5432,
});

async function run() {
  let token;
  try {
    console.log("[migration] Fetching RDS IAM auth token...");
    token = await signer.getAuthToken();
    console.log("[migration] RDS auth token obtained.");
  } catch (e) {
    console.error("[migration] Failed to get IAM auth token:", e.message);
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    port: parseInt(process.env.PGPORT || "5432"),
    user: process.env.PGUSER,
    password: token,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10000,
  });

  const sqlFile = join(__dirname, "001-arena-schema.sql");
  const sql = readFileSync(sqlFile, "utf8");

  const client = await pool.connect();
  try {
    console.log("[migration] Running 001-arena-schema.sql ...");
    await client.query(sql);
    console.log("[migration] Migration completed successfully.");

    // Verify tables were created
    const check = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log("[migration] Tables in DB:", check.rows.map(r => r.table_name).join(", "));
  } catch (err) {
    console.error("[migration] Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
