import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { accounts } from "./accounts";
import { roleEnum } from "./enums";
import { integrations } from "./integrations";
import { organizationMembers } from "./organization-members";
import { organizations } from "./organizations";
import { sessions } from "./sessions";

/**
 * Users table
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  defaultOrganizationId: uuid("default_organization_id").references(() => organizations.id),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  integrations: many(integrations),
  organizationMemberships: many(organizationMembers),
  defaultOrganization: one(organizations, {
    fields: [users.defaultOrganizationId],
    references: [organizations.id],
    relationName: "defaultOrganization",
  }),
}));