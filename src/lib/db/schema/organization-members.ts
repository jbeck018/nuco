import { pgTable, text, timestamp, boolean, primaryKey, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizationRoleEnum } from "./enums";
import { organizations } from "./organizations";
import { users } from "./users";
// Export Slack analytics schema


/**
 * Organization members table (join table between users and organizations)
 */
export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom().notNull().unique(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: organizationRoleEnum("role").default("member").notNull(),
    invitedEmail: text("invited_email"),
    inviteAccepted: boolean("invite_accepted").default(false),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    uniqMembership: primaryKey({ columns: [table.organizationId, table.userId] }),
  })
);

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));