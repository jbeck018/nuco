import { pgTable, timestamp, varchar, integer, json, uuid, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { organizations } from "./organizations";

/**
 * Organization token usage tracking table
 */
export const organizationTokenUsage = pgTable("organization_token_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  modelId: varchar("model_id", { length: 50 }).notNull(),
  provider: varchar("provider", { length: 20 }).notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  estimatedCost: integer("estimated_cost").notNull().default(0), // Cost in millicents (0.00001 USD)
  queryId: varchar("query_id", { length: 100 }),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
  metadata: json("metadata"),
}, (table) => ({
  orgIdIdx: index("org_token_usage_org_id_idx").on(table.organizationId),
  timestampIdx: index("org_token_usage_timestamp_idx").on(table.timestamp),
  userIdIdx: index("org_token_usage_user_id_idx").on(table.userId),
}));

/**
 * Organization token usage relations
 */
export const organizationTokenUsageRelations = relations(organizationTokenUsage, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationTokenUsage.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationTokenUsage.userId],
    references: [users.id],
  }),
}));