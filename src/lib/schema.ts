import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";

/**
 * schema.ts — Drizzle ORM schema for Hoot-Hoot.
 *
 * Auth is handled by AWS Cognito. There are NO auth tables here.
 * The `cognito_users` table is a lightweight mirror of Cognito attributes
 * that we write to on first sign-in (handled by the session sync endpoint).
 * All userId foreign keys reference `cognito_users.sub` (the Cognito UUID).
 */

// ── Cognito User Mirror ───────────────────────────────────────────────────────
// One row per Cognito user. Populated / updated when the user signs in.
export const cognitoUsers = pgTable("cognito_users", {
  sub: text("sub").primaryKey(),           // Cognito user sub (UUID)
  email: text("email").notNull().unique(),
  name: text("name"),
  avatar_url: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Game Scores ───────────────────────────────────────────────────────────────
export const gameScores = pgTable(
  "game_score",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),      // Cognito sub
    gameId: text("gameId").notNull(),
    score: integer("score").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("game_score_user_game_idx").on(table.userId, table.gameId)]
);

// ── Game Attempts (free-tier daily limit tracking) ────────────────────────────
export const gameAttempts = pgTable(
  "game_attempt",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),      // Cognito sub
    gameSlug: text("gameSlug").notNull(),
    date: text("date").notNull(),          // ISO date YYYY-MM-DD (UTC)
    count: integer("count").default(0).notNull(),
  },
  (table) => [
    unique("game_attempt_unique").on(table.userId, table.gameSlug, table.date),
    index("game_attempt_user_slug_date_idx").on(table.userId, table.gameSlug, table.date),
  ]
);

// ── Polls ─────────────────────────────────────────────────────────────────────
export const polls = pgTable("poll", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull(),
});

export const pollOptions = pgTable("poll_option", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  votes: integer("votes").default(0).notNull(),
  isInput: boolean("isInput").default(false).notNull(),
  pollId: text("pollId")
    .notNull()
    .references(() => polls.id, { onDelete: "cascade" }),
});

// ── User Streaks ──────────────────────────────────────────────────────────────
export const userStreaks = pgTable("user_streak", {
  userId: text("userId").primaryKey(),     // Cognito sub
  currentStreak: integer("currentStreak").default(1).notNull(),
  longestStreak: integer("longestStreak").default(1).notNull(),
  lastActivityDate: text("lastActivityDate").notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

// ── Email Broadcasts ──────────────────────────────────────────────────────────
export const broadcasts = pgTable("broadcast", {
  id: text("id").primaryKey(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  imageName: text("imageName"),
  totalCount: integer("totalCount").default(0).notNull(),
  sentCount: integer("sentCount").default(0).notNull(),
  failedCount: integer("failedCount").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const broadcastRecipients = pgTable(
  "broadcast_recipient",
  {
    id: text("id").primaryKey(),
    broadcastId: text("broadcastId")
      .notNull()
      .references(() => broadcasts.id, { onDelete: "cascade" }),
    userId: text("userId").notNull(),      // Cognito sub
    email: text("email").notNull(),
    status: text("status").notNull().default("pending"),
    error: text("error"),
    sentAt: timestamp("sentAt", { withTimezone: true }),
  },
  (t) => [
    index("broadcast_recipient_broadcast_idx").on(t.broadcastId),
    index("broadcast_recipient_status_idx").on(t.broadcastId, t.status),
  ]
);
