/**
 * Slack Analytics Schema
 * 
 * This file defines the database schema for tracking Slack integration usage and analytics.
 */

import { pgTable, text, timestamp, uuid, integer, jsonb } from "drizzle-orm/pg-core";
import { users, organizations, integrations } from "@/lib/db/schema";

/**
 * Slack event types table
 * Tracks different types of events that occur in the Slack integration
 */
export const slackEventTypes = pgTable("slack_event_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  category: text("category").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

/**
 * Slack events table
 * Records individual events that occur in the Slack integration
 */
export const slackEvents = pgTable("slack_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventTypeId: uuid("event_type_id").references(() => slackEventTypes.id, { onDelete: "cascade" }).notNull(),
  integrationId: uuid("integration_id").references(() => integrations.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  slackUserId: text("slack_user_id"),
  slackChannelId: text("slack_channel_id"),
  slackTeamId: text("slack_team_id"),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
  metadata: jsonb("metadata"),
});

/**
 * Slack usage metrics table
 * Aggregated metrics for Slack integration usage
 */
export const slackUsageMetrics = pgTable("slack_usage_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id").references(() => integrations.id, { onDelete: "cascade" }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  metricName: text("metric_name").notNull(),
  metricValue: integer("metric_value").notNull(),
  timeframe: text("timeframe").notNull(), // 'daily', 'weekly', 'monthly'
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

/**
 * Slack user activity table
 * Tracks user activity and engagement with the Slack integration
 */
export const slackUserActivity = pgTable("slack_user_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id").references(() => integrations.id, { onDelete: "cascade" }).notNull(),
  slackUserId: text("slack_user_id").notNull(),
  slackUserName: text("slack_user_name"),
  lastActive: timestamp("last_active", { mode: "date" }),
  totalInteractions: integer("total_interactions").default(0).notNull(),
  commandsUsed: integer("commands_used").default(0).notNull(),
  messagesReceived: integer("messages_received").default(0).notNull(),
  messagesSent: integer("messages_sent").default(0).notNull(),
  reactionsReceived: integer("reactions_received").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

/**
 * Slack channel activity table
 * Tracks activity in different Slack channels
 */
export const slackChannelActivity = pgTable("slack_channel_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id").references(() => integrations.id, { onDelete: "cascade" }).notNull(),
  slackChannelId: text("slack_channel_id").notNull(),
  slackChannelName: text("slack_channel_name"),
  totalInteractions: integer("total_interactions").default(0).notNull(),
  commandsUsed: integer("commands_used").default(0).notNull(),
  messagesReceived: integer("messages_received").default(0).notNull(),
  messagesSent: integer("messages_sent").default(0).notNull(),
  uniqueUsers: integer("unique_users").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

/**
 * Slack AI performance metrics table
 * Tracks performance metrics for AI responses in Slack
 */
export const slackAIPerformance = pgTable("slack_ai_performance", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id").references(() => integrations.id, { onDelete: "cascade" }).notNull(),
  messageId: text("message_id").notNull(),
  slackUserId: text("slack_user_id"),
  slackChannelId: text("slack_channel_id"),
  promptLength: integer("prompt_length"),
  responseLength: integer("response_length"),
  responseTime: integer("response_time"), // in milliseconds
  modelUsed: text("model_used"),
  feedbackRating: integer("feedback_rating"), // 1-5 scale
  feedbackComment: text("feedback_comment"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}); 