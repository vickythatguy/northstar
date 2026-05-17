import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import * as schema from "./schema";

const DB_PATH =
  process.env.DATABASE_URL?.replace(/^file:/, "") ??
  path.join(process.cwd(), "northstar.db");

// Idempotent schema bootstrap. Cheap to run on cold start; saves us a
// migration pipeline until the schema grows past chat tables.
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
`;

declare global {
  // Reuse the connection across hot reloads in dev.
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
