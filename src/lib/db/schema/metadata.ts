/**
 * metadata.ts
 * 
 * This file defines the schema for user preferences and settings metadata.
 * It provides a flexible way to store key-value pairs for different entities.
 */
import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { users, organizations, integrations } from '../schema';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Define a more specific type for JSON values
type JsonValue = 
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

/**
 * Entity-level metadata table
 * Stores metadata for various entities like users, organizations, and integrations
 */
export const metadata = pgTable('metadata', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // user, organization, integration, etc.
  entityId: uuid('entity_id').notNull(),
  key: varchar('key', { length: 100 }).notNull(),
  value: jsonb('value').notNull().$type<Record<string, JsonValue>>(), // Flexible JSON value
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Create indexes for fast lookups
  entityTypeIndex: index('metadata_entity_type_idx').on(table.entityType),
  entityIdIndex: index('metadata_entity_id_idx').on(table.entityId),
  keyIndex: index('metadata_key_idx').on(table.key),
  // Create a compound index for efficient lookups by entity type, ID, and key
  entityTypeIdKeyIndex: index('metadata_entity_type_id_key_idx').on(
    table.entityType,
    table.entityId,
    table.key
  ),
}));

// Define specific types for user preferences
export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  marketingEmails: boolean;
  slackMessages: boolean;
}

export interface DashboardWidget {
  id: string;
  type: string;
  position: { x: number; y: number; w: number; h: number };
  settings?: Record<string, JsonValue>;
}

export interface DashboardLayout {
  widgets: DashboardWidget[];
}

export interface UserCustomization {
  accentColor?: string;
  fontSize?: 'small' | 'medium' | 'large';
  compactMode?: boolean;
}

/**
 * User preferences table
 * A specialized metadata table for user preferences with strongly typed keys
 */
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  theme: varchar('theme', { length: 20 }).default('system').notNull(), // light, dark, system
  timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
  locale: varchar('locale', { length: 10 }).default('en-US').notNull(),
  notifications: jsonb('notifications').notNull().$type<NotificationPreferences>().default({
    email: true,
    inApp: true,
    marketingEmails: false,
    slackMessages: true,
  }),
  dashboardLayout: jsonb('dashboard_layout').$type<DashboardLayout>(),
  customization: jsonb('customization').$type<UserCustomization>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIndex: index('user_preferences_user_id_idx').on(table.userId),
}));

// Define specific types for organization settings
export interface SlackSettings {
  notifyOnNewMembers?: boolean;
  notifyOnIntegrationChanges?: boolean;
  defaultChannels?: string[];
  webhookUrl?: string;
}

export interface AiSettings {
  defaultModel?: string;
  maxTokensPerRequest?: number;
  promptTemplates?: Array<{ id: string; name: string; isDefault?: boolean }>;
}

/**
 * Organization settings table
 * A specialized metadata table for organization settings
 */
export const organizationSettings = pgTable('organization_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  defaultIntegrations: jsonb('default_integrations').$type<string[]>(),
  memberDefaultRole: varchar('member_default_role', { length: 20 }).default('member').notNull(),
  slackSettings: jsonb('slack_settings').$type<SlackSettings>(),
  aiSettings: jsonb('ai_settings').$type<AiSettings>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  organizationIdIndex: index('organization_settings_organization_id_idx').on(table.organizationId),
}));

// Define specific types for integration settings
export interface SyncSettings {
  lastSyncTime?: string;
  objectsToSync?: string[];
  fieldMappings?: Record<string, string>;
}

export interface WebhookSettings {
  enabled?: boolean;
  events?: string[];
  url?: string;
  secret?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffFactor: number;
}

export interface ApiSettings {
  rateLimit?: number;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

/**
 * Integration settings table
 * A specialized metadata table for integration-specific settings
 */
export const integrationSettings = pgTable('integration_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  integrationId: uuid('integration_id').notNull().references(() => integrations.id, { onDelete: 'cascade' }),
  syncFrequency: varchar('sync_frequency', { length: 20 }).default('hourly').notNull(), // realtime, hourly, daily, weekly
  syncSettings: jsonb('sync_settings').$type<SyncSettings>(),
  webhookSettings: jsonb('webhook_settings').$type<WebhookSettings>(),
  apiSettings: jsonb('api_settings').$type<ApiSettings>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  integrationIdIndex: index('integration_settings_integration_id_idx').on(table.integrationId),
}));

// Zod schemas for type safety and validation
export const insertMetadataSchema = createInsertSchema(metadata);
export const selectMetadataSchema = createSelectSchema(metadata);

// Manually define schemas to avoid deep type instantiation issues
export const insertUserPreferencesSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  theme: z.string().optional().default('system'),
  timezone: z.string().optional().default('UTC'),
  locale: z.string().optional().default('en-US'),
  notifications: z.object({
    email: z.boolean(),
    inApp: z.boolean(),
    marketingEmails: z.boolean(),
    slackMessages: z.boolean(),
  }).default({
    email: true,
    inApp: true,
    marketingEmails: false,
    slackMessages: true,
  }),
  dashboardLayout: z.object({
    widgets: z.array(z.object({
      id: z.string(),
      type: z.string(),
      position: z.object({
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
      }),
      settings: z.record(z.any()).optional(),
    }))
  }).optional(),
  customization: z.object({
    accentColor: z.string().optional(),
    fontSize: z.enum(['small', 'medium', 'large']).optional(),
    compactMode: z.boolean().optional(),
  }).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const selectUserPreferencesSchema = createSelectSchema(userPreferences);

// Manually define organization settings schema
export const insertOrganizationSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  defaultIntegrations: z.array(z.string()).optional().nullable(),
  memberDefaultRole: z.string().default('member'),
  slackSettings: z.object({
    notifyOnNewMembers: z.boolean().optional(),
    notifyOnIntegrationChanges: z.boolean().optional(),
    defaultChannels: z.array(z.string()).optional(),
    webhookUrl: z.string().optional(),
  }).optional().nullable(),
  aiSettings: z.object({
    defaultModel: z.string().optional(),
    maxTokensPerRequest: z.number().optional(),
    promptTemplates: z.array(z.object({
      id: z.string(),
      name: z.string(),
      isDefault: z.boolean().optional(),
    })).optional(),
  }).optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const selectOrganizationSettingsSchema = createSelectSchema(organizationSettings);

// Manually define integration settings schema
export const insertIntegrationSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  integrationId: z.string().uuid(),
  syncFrequency: z.string().default('hourly'),
  syncSettings: z.object({
    lastSyncTime: z.string().optional(),
    objectsToSync: z.array(z.string()).optional(),
    fieldMappings: z.record(z.string()).optional(),
  }).optional().nullable(),
  webhookSettings: z.object({
    enabled: z.boolean().optional(),
    events: z.array(z.string()).optional(),
    url: z.string().optional(),
    secret: z.string().optional(),
  }).optional().nullable(),
  apiSettings: z.object({
    rateLimit: z.number().optional(),
    timeout: z.number().optional(),
    retryPolicy: z.object({
      maxRetries: z.number(),
      backoffFactor: z.number(),
    }).optional(),
  }).optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const selectIntegrationSettingsSchema = createSelectSchema(integrationSettings);

// Type definitions for use in application code
export type Metadata = typeof metadata.$inferSelect;
export type NewMetadata = typeof metadata.$inferInsert;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;

export type OrganizationSettings = typeof organizationSettings.$inferSelect;
export type NewOrganizationSettings = typeof organizationSettings.$inferInsert;

export type IntegrationSettings = typeof integrationSettings.$inferSelect;
export type NewIntegrationSettings = typeof integrationSettings.$inferInsert; 