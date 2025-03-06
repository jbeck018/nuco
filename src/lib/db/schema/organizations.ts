import { uuid, timestamp, text, boolean } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizationMembers } from "./organization-members";
import { integrations } from "./integrations";
import { users } from "./users";
/**
 * Organizations table
 */
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  website: text("website"),
  billingEmail: text("billing_email"),
  plan: text("plan").default("free").notNull(),
  // Stripe related fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSubscriptionStatus: text("stripe_subscription_status"),
  stripePriceId: text("stripe_price_id"),
  subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end", { mode: "date" }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  // Timestamps
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
// Export Slack analytics schema

/**
 * Organization relations
 */
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  integrations: many(integrations),
  users: many(users, { relationName: "defaultOrganization" }),
}));