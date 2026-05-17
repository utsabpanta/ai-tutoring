import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash"),
  gradeBand: text("grade_band").notNull(),
  timezone: text("timezone").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  subject: text("subject").notNull(),
  topic: text("topic"),
  hintTierState: text("hint_tier_state").notNull().default("{}"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  lastActiveAt: integer("last_active_at", { mode: "timestamp_ms" }).notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  contentMd: text("content_md").notNull(),
  contentBlocksJson: text("content_blocks_json"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const usageDaily = sqliteTable("usage_daily", {
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  date: text("date").notNull(),
  messageCount: integer("message_count").notNull().default(0),
  activeSeconds: integer("active_seconds").notNull().default(0),
});

export const guardEvents = sqliteTable("guard_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  conversationId: text("conversation_id"),
  guardrailName: text("guardrail_name").notNull(),
  action: text("action").notNull(),
  snippetRedacted: text("snippet_redacted"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
