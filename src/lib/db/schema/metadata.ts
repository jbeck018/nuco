/**
 * metadata.ts
 * 
 * This file defines the schema for user preferences and settings metadata.
 * It provides a flexible way to store key-value pairs for different entities.
 */
import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { JsonValue } from '../types/metadata-types';

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

// Zod schemas for type safety and validation
export const insertMetadataSchema = createInsertSchema(metadata);
export const selectMetadataSchema = createSelectSchema(metadata);

// Type definitions for use in application code
export type Metadata = typeof metadata.$inferSelect;
export type NewMetadata = typeof metadata.$inferInsert;