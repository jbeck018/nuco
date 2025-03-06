import { pgTable, text, timestamp, json, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * Vector embeddings table
 */
export const embeddings = pgTable("embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content").notNull(),
  embedding: text("embedding").notNull(), // JSON string of the embedding vector
  metadata: json("metadata"),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

/**
 * Embedding relations
 */
export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  user: one(users, {
    fields: [embeddings.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [embeddings.organizationId],
    references: [organizations.id],
  }),
}));