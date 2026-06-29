// Database admin utilities for Dashboard
// Displays AWS connection info and table metadata

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
