import { Pool } from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import { fromWebToken } from "@aws-sdk/credential-providers";

const signer = new Signer({
  credentials: fromWebToken({
    roleArn: process.env.AWS_ROLE_ARN,
    webIdentityToken: process.env.VERCEL_OIDC_TOKEN,
    clientConfig: { region: process.env.AWS_REGION },
  }),
  region: process.env.AWS_REGION,
  hostname: process.env.PGHOST,
  username: process.env.PGUSER ?? "postgres",
  port: 5432,
});

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE ?? "postgres",
  port: 5432,
  user: process.env.PGUSER ?? "postgres",
  password: () => signer.getAuthToken(),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

const tablesRes = await pool.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' ORDER BY table_name
`);
console.log("TABLES:", tablesRes.rows.map((r) => r.table_name).join(", "));

for (const t of tablesRes.rows.map((r) => r.table_name)) {
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [t]
  );
  console.log(`\n[${t}] ->`, cols.rows.map((c) => c.column_name).join(", "));
}

await pool.end();
