import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { integrations } from './integrations';
import { SyncSettings, WebhookSettings, ApiSettings } from '../types/metadata-types';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
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


export const selectIntegrationSettingsSchema = createSelectSchema(integrationSettings);
export const insertIntegrationSettingsSchema = createInsertSchema(integrationSettings);

export type IntegrationSettings = typeof integrationSettings.$inferSelect;
export type NewIntegrationSettings = typeof integrationSettings.$inferInsert;