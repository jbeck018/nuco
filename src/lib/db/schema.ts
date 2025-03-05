import { pgTable, text, timestamp, varchar, integer, boolean, primaryKey, pgEnum, json, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Import Slack analytics schema
import {
  slackEventTypes,
  slackEvents,
  slackUsageMetrics,
  slackUserActivity,
  slackChannelActivity,
  slackAIPerformance
} from "./schema/slack-analytics";

import {
  metadata,
  userPreferences,
  organizationSettings,
  integrationSettings
} from "./schema/metadata";

export {
  metadata,
  userPreferences,
  organizationSettings,
  integrationSettings
};

// Import Extensions schema
import {
  extensions,
  extensionMarketplace,
  extensionStorage,
  extensionLogs,
  extensionReviews
} from "./schema/extensions";

// Export Slack analytics schema
export {
  slackEventTypes,
  slackEvents,
  slackUsageMetrics,
  slackUserActivity,
  slackChannelActivity,
  slackAIPerformance
};

// Export Extensions schema
export {
  extensions,
  extensionMarketplace,
  extensionStorage,
  extensionLogs,
  extensionReviews
};

/**
 * User role enum
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);

/**
 * Organization role enum
 */
export const organizationRoleEnum = pgEnum("organization_role", ["member", "admin", "owner"]);

/**
 * Integration type enum
 */
export const integrationTypeEnum = pgEnum("integration_type", ["salesforce", "hubspot", "google", "slack"]);

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

/**
 * Organization members table (join table between users and organizations)
 */
export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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

/**
 * Organization relations
 */
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  integrations: many(integrations),
  users: many(users, { relationName: "defaultOrganization" }),
}));

/**
 * User relations
 */
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

/**
 * Organization members relations
 */
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

/**
 * Accounts table for OAuth providers
 */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

/**
 * Account relations
 */
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

/**
 * Sessions table
 */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionToken: text("session_token").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

/**
 * Session relations
 */
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

/**
 * Verification tokens table for email verification
 */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({
      columns: [vt.identifier, vt.token],
    }),
  })
);

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

/**
 * API tokens table for storing user API tokens
 */
export const apiTokens = pgTable("api_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  lastUsedAt: timestamp("last_used_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

/**
 * API token relations
 */
export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, {
    fields: [apiTokens.userId],
    references: [users.id],
  }),
}));

/**
 * Usage tracking table for monitoring user API usage
 */
export const usageRecords = pgTable("usage_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  count: integer("count").notNull(),
  date: timestamp("date", { mode: "date" }).defaultNow().notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

/**
 * Usage record relations
 */
export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  user: one(users, {
    fields: [usageRecords.userId],
    references: [users.id],
  }),
}));

/**
 * Chat conversations table
 */
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at", { mode: "date" }).defaultNow().notNull(),
});

/**
 * Conversation relations
 */
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [conversations.organizationId],
    references: [organizations.id],
  }),
  messages: many(messages),
}));

/**
 * Chat messages table
 */
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'system', 'user', 'assistant'
  content: text("content").notNull(),
  tokens: integer("tokens"),
  modelId: text("model_id"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

/**
 * Message relations
 */
export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

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

/**
 * Prompt templates table
 */
export const promptTemplates = pgTable("prompt_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  variables: json("variables").default([]),
  tags: json("tags").default([]),
  isPublic: boolean("is_public").default(false),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

/**
 * Prompt template relations
 */
export const promptTemplatesRelations = relations(promptTemplates, ({ one }) => ({
  user: one(users, {
    fields: [promptTemplates.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [promptTemplates.organizationId],
    references: [organizations.id],
  }),
})); 