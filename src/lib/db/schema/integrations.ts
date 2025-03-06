import { pgTable, text, timestamp, boolean, json, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { integrationTypeEnum } from "./enums";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * Integrations table for storing user integrations
 */
export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" }),
  type: integrationTypeEnum("type").notNull(),
  name: text("name").notNull(),
  config: json("config").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
});

/**
 * Integration relations
 */
export const integrationsRelations = relations(integrations, ({ one }) => ({
  user: one(users, {
    fields: [integrations.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [integrations.organizationId],
    references: [organizations.id],
  }),
}));