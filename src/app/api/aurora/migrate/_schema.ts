/**
 * _schema.ts — idempotent DDL run automatically on Vercel startup
 * (via src/instrumentation.ts) and by the /api/aurora/migrate route.
 *
 * Auth is handled entirely by AWS Cognito — there are NO Better Auth tables.
 * cognito_users is a lightweight mirror written on first sign-in.
 * All userId columns store the Cognito sub (UUID) — no FK to a user table
 * is needed because Cognito is the source of truth.
 * Every statement is IF NOT EXISTS so this is safe to run on every cold start.
 */
export const FULL_SCHEMA_SQL = `
-- ── Cognito User Mirror ───────────────────────────────────────
-- Populated / updated by POST /api/auth/session after every sign-in.
CREATE TABLE IF NOT EXISTS cognito_users (
  sub        TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cognito_users_email_idx ON cognito_users(email);

-- ── Feature tables (scores / attempts / streak / polls / broadcast) ──
CREATE TABLE IF NOT EXISTS game_score (
  id          TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "gameId"    TEXT NOT NULL,
  score       INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS game_score_user_game_idx ON game_score("userId", "gameId");

CREATE TABLE IF NOT EXISTS game_attempt (
  id         TEXT PRIMARY KEY,
  "userId"   TEXT NOT NULL,
  "gameSlug" TEXT NOT NULL,
  date       TEXT NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT game_attempt_unique UNIQUE ("userId", "gameSlug", date)
);
CREATE INDEX IF NOT EXISTS game_attempt_user_slug_date_idx ON game_attempt("userId", "gameSlug", date);

CREATE TABLE IF NOT EXISTS poll (
  id          TEXT PRIMARY KEY,
  question    TEXT NOT NULL,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_option (
  id        TEXT PRIMARY KEY,
  label     TEXT NOT NULL,
  votes     INTEGER NOT NULL DEFAULT 0,
  "isInput" BOOLEAN NOT NULL DEFAULT false,
  "pollId"  TEXT NOT NULL REFERENCES poll(id) ON DELETE CASCADE
);

-- userId stores Cognito sub — no FK needed (Cognito is the source of truth)
CREATE TABLE IF NOT EXISTS user_streak (
  "userId"           TEXT PRIMARY KEY,
  "currentStreak"    INTEGER NOT NULL DEFAULT 1,
  "longestStreak"    INTEGER NOT NULL DEFAULT 1,
  "lastActivityDate" TEXT NOT NULL,
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast (
  id            TEXT PRIMARY KEY,
  subject       TEXT NOT NULL,
  message       TEXT NOT NULL,
  "imageName"   TEXT,
  "totalCount"  INTEGER NOT NULL DEFAULT 0,
  "sentCount"   INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast_recipient (
  id            TEXT PRIMARY KEY,
  "broadcastId" TEXT NOT NULL REFERENCES broadcast(id) ON DELETE CASCADE,
  "userId"      TEXT NOT NULL,
  email         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  error         TEXT,
  "sentAt"      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS broadcast_recipient_broadcast_idx ON broadcast_recipient("broadcastId");
CREATE INDEX IF NOT EXISTS broadcast_recipient_status_idx    ON broadcast_recipient("broadcastId", status);

-- ── Arena / Company tables ────────────────────────────────────
-- arena_users: standalone user accounts used by the arena auth system
CREATE TABLE IF NOT EXISTS arena_users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS arena_users_email_idx ON arena_users(email);

CREATE TABLE IF NOT EXISTS arena_sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES arena_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS arena_sessions_user_idx ON arena_sessions(user_id);

CREATE TABLE IF NOT EXISTS companies (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  name       TEXT NOT NULL,
  logo_url   TEXT,
  industry   TEXT,
  website    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS companies_user_idx ON companies(user_id);

CREATE TABLE IF NOT EXISTS practice_attempts (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  score            INTEGER NOT NULL DEFAULT 0,
  total_questions  INTEGER NOT NULL DEFAULT 0,
  time_taken_ms    BIGINT NOT NULL DEFAULT 0,
  difficulty       TEXT NOT NULL DEFAULT 'mixed',
  question_log     JSONB NOT NULL DEFAULT '[]',
  warnings_count   INTEGER NOT NULL DEFAULT 0,
  is_strict_mode   BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS practice_attempts_user_idx ON practice_attempts(user_id);

CREATE TABLE IF NOT EXISTS company_tests (
  id                   TEXT PRIMARY KEY,
  company_id           TEXT NOT NULL,
  title                TEXT NOT NULL,
  description          TEXT,
  question_config      JSONB NOT NULL DEFAULT '[]',
  total_questions      INTEGER NOT NULL DEFAULT 0,
  time_limit_minutes   INTEGER NOT NULL DEFAULT 30,
  require_fullscreen   BOOLEAN NOT NULL DEFAULT false,
  require_camera       BOOLEAN NOT NULL DEFAULT false,
  max_warnings         INTEGER NOT NULL DEFAULT 3,
  allow_tab_switch     BOOLEAN NOT NULL DEFAULT false,
  status               TEXT NOT NULL DEFAULT 'draft',
  invite_code          TEXT UNIQUE,
  max_participants     INTEGER,
  starts_at            TIMESTAMPTZ,
  ends_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS company_tests_company_idx ON company_tests(company_id);
CREATE INDEX IF NOT EXISTS company_tests_invite_idx  ON company_tests(invite_code);

CREATE TABLE IF NOT EXISTS test_sessions (
  id               TEXT PRIMARY KEY,
  test_id          TEXT NOT NULL REFERENCES company_tests(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL,
  score            INTEGER,
  total_questions  INTEGER NOT NULL DEFAULT 0,
  time_taken_ms    BIGINT,
  warnings_count   INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'in_progress',
  question_log     JSONB NOT NULL DEFAULT '[]',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  CONSTRAINT test_sessions_unique UNIQUE (test_id, user_id)
);
CREATE INDEX IF NOT EXISTS test_sessions_test_idx ON test_sessions(test_id);
CREATE INDEX IF NOT EXISTS test_sessions_user_idx ON test_sessions(user_id);

CREATE TABLE IF NOT EXISTS warning_logs (
  id             BIGSERIAL PRIMARY KEY,
  session_id     TEXT NOT NULL,
  session_type   TEXT NOT NULL DEFAULT 'practice',
  reason         TEXT NOT NULL,
  warning_number INTEGER NOT NULL DEFAULT 1,
  s3_image_url   TEXT,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS warning_logs_session_idx ON warning_logs(session_id);

CREATE TABLE IF NOT EXISTS arena_questions (
  id          BIGSERIAL PRIMARY KEY,
  game_slug   TEXT NOT NULL,
  difficulty  INTEGER NOT NULL DEFAULT 1,
  category    TEXT NOT NULL DEFAULT 'general',
  payload     JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS arena_questions_slug_diff_idx ON arena_questions(game_slug, difficulty);
`;
