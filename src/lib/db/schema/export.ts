import { pgTable, text, jsonb, timestamp, uuid } from 'drizzle-orm/pg-core';

export const exportResults = pgTable('export_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  analysisId: text('analysis_id').notNull(),
  format: text('format').notNull(),
  data: jsonb('data').notNull(),
  metadata: jsonb('metadata').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}); 