-- ============================================================
-- 002-cognito-auth-migration.sql
-- Migrate Hoot-Hoot from Better Auth / simple-auth to AWS Cognito.
--
-- Run this ONCE against your Aurora PostgreSQL cluster.
-- It is safe to run multiple times (all statements are idempotent).
-- ============================================================

-- ── 1. Create the Cognito user mirror table ──────────────────────────────────
-- One row per Cognito user. Populated on first sign-in via /api/auth/session.
CREATE TABLE IF NOT EXISTS cognito_users (
  sub         TEXT PRIMARY KEY,            -- Cognito sub (stable UUID)
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cognito_users_email ON cognito_users (email);

-- ── 2. Create / keep practice_attempts table ─────────────────────────────────
-- user_id references cognito_users.sub (TEXT, not integer)
CREATE TABLE IF NOT EXISTS practice_attempts (
  id                TEXT        PRIMARY KEY,
  user_id           TEXT        NOT NULL,
  score             INTEGER     NOT NULL DEFAULT 0,
  total_questions   INTEGER     NOT NULL DEFAULT 10,
  time_taken_ms     BIGINT      NOT NULL DEFAULT 0,
  difficulty        TEXT        NOT NULL DEFAULT 'mixed'
                    CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')),
  question_log      JSONB       NOT NULL DEFAULT '[]',
  warnings_count    INTEGER     NOT NULL DEFAULT 0,
  is_strict_mode    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_user_id
  ON practice_attempts (user_id);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_score_desc
  ON practice_attempts (score DESC, time_taken_ms ASC);

-- ── 3. Create / keep warning_logs table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS warning_logs (
  id             BIGSERIAL   PRIMARY KEY,
  session_id     TEXT        NOT NULL,
  session_type   TEXT        NOT NULL CHECK (session_type IN ('practice', 'test')),
  reason         TEXT        NOT NULL,
  warning_number INTEGER     NOT NULL,
  metadata       JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warning_logs_session_id
  ON warning_logs (session_id);

-- ── 4. Create game_score table (Drizzle-managed) ─────────────────────────────
CREATE TABLE IF NOT EXISTS game_score (
  id          TEXT        PRIMARY KEY,
  "userId"    TEXT        NOT NULL,        -- Cognito sub
  "gameId"    TEXT        NOT NULL,
  score       INTEGER     NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_score_user_game_idx
  ON game_score ("userId", "gameId");

-- ── 5. Create game_attempt table (Drizzle-managed) ───────────────────────────
CREATE TABLE IF NOT EXISTS game_attempt (
  id          TEXT    PRIMARY KEY,
  "userId"    TEXT    NOT NULL,            -- Cognito sub
  "gameSlug"  TEXT    NOT NULL,
  date        TEXT    NOT NULL,            -- YYYY-MM-DD UTC
  count       INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT game_attempt_unique UNIQUE ("userId", "gameSlug", date)
);

CREATE INDEX IF NOT EXISTS game_attempt_user_slug_date_idx
  ON game_attempt ("userId", "gameSlug", date);

-- ── 6. Create user_streak table (Drizzle-managed) ────────────────────────────
CREATE TABLE IF NOT EXISTS user_streak (
  "userId"           TEXT        PRIMARY KEY,  -- Cognito sub
  "currentStreak"    INTEGER     NOT NULL DEFAULT 1,
  "longestStreak"    INTEGER     NOT NULL DEFAULT 1,
  "lastActivityDate" TEXT        NOT NULL,
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. Create poll tables (Drizzle-managed) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS poll (
  id          TEXT        PRIMARY KEY,
  question    TEXT        NOT NULL,
  "isActive"  BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS poll_option (
  id        TEXT    PRIMARY KEY,
  label     TEXT    NOT NULL,
  votes     INTEGER NOT NULL DEFAULT 0,
  "isInput" BOOLEAN NOT NULL DEFAULT FALSE,
  "pollId"  TEXT    NOT NULL REFERENCES poll(id) ON DELETE CASCADE
);

-- ── 8. Create broadcast tables (Drizzle-managed) ─────────────────────────────
CREATE TABLE IF NOT EXISTS broadcast (
  id             TEXT        PRIMARY KEY,
  subject        TEXT        NOT NULL,
  message        TEXT        NOT NULL,
  "imageName"    TEXT,
  "totalCount"   INTEGER     NOT NULL DEFAULT 0,
  "sentCount"    INTEGER     NOT NULL DEFAULT 0,
  "failedCount"  INTEGER     NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast_recipient (
  id            TEXT        PRIMARY KEY,
  "broadcastId" TEXT        NOT NULL REFERENCES broadcast(id) ON DELETE CASCADE,
  "userId"      TEXT        NOT NULL,      -- Cognito sub
  email         TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending',
  error         TEXT,
  "sentAt"      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS broadcast_recipient_broadcast_idx
  ON broadcast_recipient ("broadcastId");

CREATE INDEX IF NOT EXISTS broadcast_recipient_status_idx
  ON broadcast_recipient ("broadcastId", status);

-- ── 9. Drop old Better Auth / simple-auth tables (safe with IF EXISTS) ────────
-- These are no longer needed. Comment out if you want to keep historical data.
-- DROP TABLE IF EXISTS "session" CASCADE;
-- DROP TABLE IF EXISTS "account" CASCADE;
-- DROP TABLE IF EXISTS "verification" CASCADE;
-- DROP TABLE IF EXISTS "user" CASCADE;
-- DROP TABLE IF EXISTS app_users CASCADE;
-- DROP TABLE IF EXISTS sessions CASCADE;

-- ============================================================
-- Done. Run:  psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/002-cognito-auth-migration.sql
-- ============================================================
