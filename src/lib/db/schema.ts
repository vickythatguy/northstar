import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    pageKey: text("page_key").notNull(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => ({ byPage: index("chat_messages_page_idx").on(t.pageKey, t.createdAt) }),
);

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  reason: text("reason"),
  imageUrl: text("image_url"),
  targetDate: integer("target_date", { mode: "timestamp_ms" }),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const journalEntries = sqliteTable("journal_entries", {
  id: text("id").primaryKey(),
  body: text("body").notNull(),
  categories: text("categories").notNull(),
  source: text("source"),
  embedding: text("embedding"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const weightLogs = sqliteTable("weight_logs", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  weightKg: real("weight_kg").notNull(),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const foodLogs = sqliteTable("food_logs", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  item: text("item").notNull(),
  calories: real("calories").notNull().default(0),
  proteinG: real("protein_g").notNull().default(0),
  carbsG: real("carbs_g").notNull().default(0),
  fatG: real("fat_g").notNull().default(0),
  source: text("source"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const workoutSplits = sqliteTable("workout_splits", {
  dayOfWeek: integer("day_of_week").primaryKey(),
  type: text("type").notNull(),
});

export const splitExercises = sqliteTable("split_exercises", {
  id: text("id").primaryKey(),
  splitType: text("split_type").notNull(),
  exerciseName: text("exercise_name").notNull(),
  targetSets: integer("target_sets").notNull(),
  targetReps: integer("target_reps").notNull(),
  targetWeightKg: real("target_weight_kg"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const workouts = sqliteTable("workouts", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  splitType: text("split_type").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const workoutSets = sqliteTable("workout_sets", {
  id: text("id").primaryKey(),
  workoutId: text("workout_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  setNumber: integer("set_number").notNull(),
  weightKg: real("weight_kg"),
  reps: integer("reps"),
  rpe: real("rpe"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  source: text("source").notNull(),
  plaidItemId: text("plaid_item_id"),
  plaidAccountId: text("plaid_account_id"),
  balance: real("balance").notNull().default(0),
  currency: text("currency").notNull().default("CAD"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id"),
    date: text("date").notNull(),
    description: text("description").notNull(),
    rawDescription: text("raw_description"),
    amount: real("amount").notNull(),
    category: text("category"),
    source: text("source").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => ({
    byDate: index("transactions_date_idx").on(t.date),
    byCategory: index("transactions_category_idx").on(t.category),
  }),
);

export const budgets = sqliteTable(
  "budgets",
  {
    id: text("id").primaryKey(),
    category: text("category").notNull(),
    month: text("month").notNull(),
    amount: real("amount").notNull(),
  },
  (t) => ({ uniq: uniqueIndex("budgets_uniq").on(t.category, t.month) }),
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type WeightLog = typeof weightLogs.$inferSelect;
export type FoodLog = typeof foodLogs.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type SplitExercise = typeof splitExercises.$inferSelect;
export type WorkoutSplit = typeof workoutSplits.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Setting = typeof settings.$inferSelect;
