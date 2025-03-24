import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';

export const numericalAnalysisResults = pgTable('numerical_analysis_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: text('analysis_id').notNull(),
  metrics: jsonb('metrics').notNull().default({}),
  insights: jsonb('insights').notNull().default([]),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}); 