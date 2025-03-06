import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { NotificationPreferences, DashboardLayout, UserCustomization } from '../types/metadata-types';
import { createSelectSchema } from 'drizzle-zod';

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

export const selectUserPreferencesSchema = createSelectSchema(userPreferences);

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;