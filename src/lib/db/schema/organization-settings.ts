import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { SlackSettings, AiSettings } from '../types/metadata-types';
import { createSelectSchema } from 'drizzle-zod';

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

export const selectOrganizationSettingsSchema = createSelectSchema(organizationSettings);

export type OrganizationSettings = typeof organizationSettings.$inferSelect;
export type NewOrganizationSettings = typeof organizationSettings.$inferInsert;