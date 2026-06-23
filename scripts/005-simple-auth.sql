-- Simple, clean authentication schema for Hoot-Hoot
-- No complex Better Auth tables - just what we need

-- Users table
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'student', -- 'student' or 'company'
  company_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for storing auth tokens
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Drop old Better Auth tables if they exist
DROP TABLE IF EXISTS verification CASCADE;
DROP TABLE IF EXISTS account CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
