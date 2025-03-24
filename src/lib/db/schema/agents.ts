import { pgTable, text, timestamp, jsonb, uuid, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Agents table schema
 * Stores agent configurations and metadata
 */
export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  config: jsonb("config").notNull().default({}),
  state: jsonb("state").notNull().default({}),
  metadata: jsonb("metadata").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Agent executions table schema
 * Stores agent execution history and results
 */
export const agentExecutions = pgTable("agent_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull().references(() => agents.id),
  status: text("status").notNull(),
  input: jsonb("input").notNull().default({}),
  output: jsonb("output").notNull().default({}),
  error: jsonb("error"),
  metadata: jsonb("metadata").notNull().default({}),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

/**
 * Agent state table schema
 * Stores distributed state for agents
 */
export const agentStates = pgTable("agent_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull().references(() => agents.id),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const agentChains = pgTable('agent_chains', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  config: jsonb('config').notNull(),
  status: text('status', { enum: ['pending', 'running', 'completed', 'failed'] }).notNull(),
  currentStep: integer('current_step').notNull().default(0),
  results: jsonb('results').notNull().default([]),
  errors: jsonb('errors').notNull().default([]),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata').notNull().default({})
});

// Zod schemas for type validation
export const insertAgentSchema = createInsertSchema(agents);
export const selectAgentSchema = createSelectSchema(agents);

export const insertAgentExecutionSchema = createInsertSchema(agentExecutions);
export const selectAgentExecutionSchema = createSelectSchema(agentExecutions);

export const insertAgentStateSchema = createInsertSchema(agentStates);
export const selectAgentStateSchema = createSelectSchema(agentStates);

// Types
export type Agent = z.infer<typeof selectAgentSchema>;
export type NewAgent = z.infer<typeof insertAgentSchema>;

export type AgentExecution = z.infer<typeof selectAgentExecutionSchema>;
export type NewAgentExecution = z.infer<typeof insertAgentExecutionSchema>;

export type AgentState = z.infer<typeof selectAgentStateSchema>;
export type NewAgentState = z.infer<typeof insertAgentStateSchema>; 