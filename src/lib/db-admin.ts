import { PostgresJsDatabase, drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './db-schema';

let db: PostgresJsDatabase<typeof schema> | null = null;

export async function getAdminDb() {
  if (db) return db;

  const connectionString = buildConnectionString();
  
  if (!connectionString) {
    throw new Error('Database connection string not available');
  }

  const client = postgres(connectionString);
  db = drizzle(client, { schema });
  
  return db;
}

function buildConnectionString(): string {
  // AWS Aurora PostgreSQL environment variables
  const pgHost = process.env.AWS_APG_PGHOST;
  const pgUser = process.env.AWS_APG_PGUSER;
  const pgDatabase = process.env.AWS_APG_PGDATABASE;
  const pgPort = process.env.AWS_APG_PGPORT || '5432';
  const pgSslMode = process.env.AWS_APG_PGSSLMODE || 'require';

  // IAM authentication - get temporary token
  const iamToken = process.env.AWS_RDS_IAM_TOKEN;

  if (!pgHost || !pgUser || !pgDatabase) {
    console.warn('[DB] AWS Aurora env vars missing:', {
      pgHost: !!pgHost,
      pgUser: !!pgUser,
      pgDatabase: !!pgDatabase,
    });
    return '';
  }

  // Build connection string with IAM token or fallback
  const connStr = `postgresql://${pgUser}${iamToken ? `:${iamToken}` : ''}@${pgHost}:${pgPort}/${pgDatabase}?sslmode=${pgSslMode}`;
  
  return connStr;
}

// Get database connection info for UI display
export async function getConnectionInfo() {
  return {
    host: process.env.AWS_APG_PGHOST || 'Not configured',
    port: process.env.AWS_APG_PGPORT || '5432',
    database: process.env.AWS_APG_PGDATABASE || 'Not configured',
    user: process.env.AWS_APG_PGUSER || 'Not configured',
    region: process.env.AWS_APG_AWS_REGION || 'Not configured',
    sslMode: process.env.AWS_APG_PGSSLMODE || 'require',
    accountId: process.env.AWS_APG_AWS_ACCOUNT_ID || 'Not configured',
    resourceArn: process.env.AWS_APG_AWS_RESOURCE_ARN || 'Not configured',
    roleArn: process.env.AWS_APG_AWS_ROLE_ARN || 'Not configured',
    hasIamToken: !!process.env.AWS_RDS_IAM_TOKEN,
  };
}

// Get all table names and basic info
export const TABLES_INFO = {
  neon_auth: [
    { name: 'account', description: 'OAuth provider accounts' },
    { name: 'invitation', description: 'Organization invitations' },
    { name: 'jwks', description: 'JWT signing keys' },
    { name: 'member', description: 'Organization members' },
    { name: 'organization', description: 'Organizations' },
    { name: 'project_config', description: 'Project configurations' },
    { name: 'session', description: 'User sessions' },
    { name: 'user', description: 'Users' },
    { name: 'verification', description: 'Email/2FA verification' },
  ],
  public: [
    { name: 'app_users', description: 'App user profiles' },
    { name: 'arena_questions', description: 'Proctored arena questions' },
    { name: 'broadcast', description: 'Broadcast campaigns' },
    { name: 'broadcast_recipient', description: 'Broadcast recipients' },
    { name: 'companies', description: 'Company profiles' },
    { name: 'company_tests', description: 'Company placement tests' },
    { name: 'game_attempt', description: 'Game attempts by user' },
    { name: 'game_score', description: 'Game scores' },
    { name: 'poll', description: 'Polls' },
    { name: 'poll_option', description: 'Poll options' },
    { name: 'practice_attempts', description: 'Practice test attempts' },
    { name: 'test_analytics', description: 'Test analytics & statistics' },
    { name: 'test_sessions', description: 'Company test sessions' },
    { name: 'user_sessions', description: 'User sessions' },
    { name: 'user_streak', description: 'User activity streaks' },
    { name: 'warning_logs', description: 'Proctoring warning logs' },
  ],
};
