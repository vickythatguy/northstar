import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import * as schema from "./schema";

const DB_PATH =
  process.env.DATABASE_URL?.replace(/^file:/, "") ??
  path.join(process.cwd(), "northstar.db");

const BOOTSTRAP = `
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  page_key TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chat_messages_page_idx
  ON chat_messages(page_key, created_at);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  reason TEXT,
  image_url TEXT,
  target_date INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS goals_sort_idx ON goals(sort_order);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  categories TEXT NOT NULL,
  source TEXT,
  embedding TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS journal_entries_created_idx ON journal_entries(created_at);

CREATE TABLE IF NOT EXISTS weight_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS weight_logs_date_idx ON weight_logs(date);

CREATE TABLE IF NOT EXISTS food_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  item TEXT NOT NULL,
  calories REAL NOT NULL DEFAULT 0,
  protein_g REAL NOT NULL DEFAULT 0,
  carbs_g REAL NOT NULL DEFAULT 0,
  fat_g REAL NOT NULL DEFAULT 0,
  source TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS food_logs_date_idx ON food_logs(date);

CREATE TABLE IF NOT EXISTS workout_splits (
  day_of_week INTEGER PRIMARY KEY,
  type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS split_exercises (
  id TEXT PRIMARY KEY,
  split_type TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  target_sets INTEGER NOT NULL,
  target_reps INTEGER NOT NULL,
  target_weight_kg REAL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS split_exercises_type_idx ON split_exercises(split_type);

CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  split_type TEXT NOT NULL,
  notes TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS workouts_date_idx ON workouts(date);

CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg REAL,
  reps INTEGER,
  rpe REAL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS workout_sets_workout_idx ON workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS workout_sets_exercise_idx ON workout_sets(exercise_name);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  plaid_item_id TEXT,
  plaid_account_id TEXT,
  balance REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CAD',
  last_synced_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  raw_description TEXT,
  amount REAL NOT NULL,
  category TEXT,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(date);
CREATE INDEX IF NOT EXISTS transactions_category_idx ON transactions(category);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  month TEXT NOT NULL,
  amount REAL NOT NULL,
  UNIQUE(category, month)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

declare global {
  // eslint-disable-next-line no-var
  var __northstar_db: ReturnType<typeof initDb> | undefined;
}

function initDb() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(BOOTSTRAP);
  return drizzle(sqlite, { schema });
}

export const db = globalThis.__northstar_db ?? initDb();
if (process.env.NODE_ENV !== "production") {
  globalThis.__northstar_db = db;
}

export { schema };
