// Schema is bootstrapped lazily in client.ts via CREATE TABLE IF NOT EXISTS.
// Importing the client is enough to ensure tables exist.
// When the schema outgrows that approach, replace this with drizzle-kit's
// migrator: `migrate(db, { migrationsFolder: "./src/lib/db/migrations" })`.
import "./client";
console.log("northstar: db bootstrapped.");
