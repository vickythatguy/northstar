import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// One conversation thread per page for now. Multi-thread drawer is a future
// addition — when we add it, this gets a `thread_id` foreign key.
export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    pageKey: text("page_key").notNull(),
    role: text("role").notNull(), // "user" | "assistant"
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => ({
    byPage: index("chat_messages_page_idx").on(t.pageKey, t.createdAt),
  }),
);

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
