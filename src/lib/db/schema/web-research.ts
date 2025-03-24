import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';

export const webResearchResults = pgTable('web_research_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  query: text('query').notNull(),
  results: jsonb('results').notNull(),
  metadata: jsonb('metadata').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}); 