/**
 * Prompt Templates Service
 * 
 * This file contains the implementation of the prompt templates service.
 * It provides functions for creating, retrieving, updating, and deleting prompt templates.
 */

import { z } from 'zod';
import { db } from '@/lib/db';
import { promptTemplates } from '@/lib/db/schema';
import { eq, desc, like, inArray, SQL } from 'drizzle-orm';

/**
 * Prompt template variable schema
 */
export const promptTemplateVariableSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  defaultValue: z.string().optional(),
  required: z.boolean().default(false),
});

export type PromptTemplateVariable = z.infer<typeof promptTemplateVariableSchema>;

/**
 * Prompt template schema
 */
export const promptTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  variables: z.array(promptTemplateVariableSchema).default([]),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
  userId: z.string(),
  organizationId: z.string().optional(),
});

export type PromptTemplate = z.infer<typeof promptTemplateSchema>;

/**
 * Create a new prompt template
 */
export async function createPromptTemplate(template: PromptTemplate): Promise<string> {
  const [result] = await db.insert(promptTemplates).values({
    name: template.name,
    description: template.description,
    content: template.content,
    variables: template.variables,
    tags: template.tags,
    isPublic: template.isPublic,
    userId: template.userId,
    organizationId: template.organizationId,
  }).returning({ id: promptTemplates.id });

  return result.id;
}

/**
 * Get a prompt template by ID
 */
export async function getPromptTemplate(id: string): Promise<PromptTemplate | null> {
  const result = await db.query.promptTemplates.findFirst({
    where: eq(promptTemplates.id, id),
  });

  if (!result) return null;

  return {
    id: result.id,
    name: result.name,
    description: result.description || '',
    content: result.content,
    variables: result.variables as PromptTemplateVariable[],
    tags: result.tags as string[],
    isPublic: result.isPublic ?? false,
    userId: result.userId,
    organizationId: result.organizationId || undefined,
  };
}

/**
 * Update a prompt template
 */
export async function updatePromptTemplate(id: string, template: Partial<PromptTemplate>): Promise<boolean> {
  const result = await db.update(promptTemplates)
    .set({
      name: template.name,
      description: template.description,
      content: template.content,
      variables: template.variables,
      tags: template.tags,
      isPublic: template.isPublic,
      updatedAt: new Date(),
    })
    .where(eq(promptTemplates.id, id));

  return !!result;
}

/**
 * Delete a prompt template
 */
export async function deletePromptTemplate(id: string): Promise<boolean> {
  const result = await db.delete(promptTemplates)
    .where(eq(promptTemplates.id, id));

  return !!result;
}

/**
 * List prompt templates for a user
 */
export async function listUserPromptTemplates(userId: string, options?: {
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}): Promise<PromptTemplate[]> {
  const conditions: SQL<unknown>[] = [eq(promptTemplates.userId, userId)];

  if (options?.search) {
    conditions.push(like(promptTemplates.name, `%${options.search}%`));
  }

  if (options?.tags && options.tags.length > 0) {
    // This is a simplified approach - in a real app, you'd need a more sophisticated
    // way to query JSON arrays for overlapping values
    conditions.push(inArray(promptTemplates.tags as unknown as SQL<string[]>, options.tags));
  }

  const query = db.select()
    .from(promptTemplates)
    .where(conditions[0])
    .orderBy(desc(promptTemplates.updatedAt));

  if (options?.limit) {
    query.limit(options.limit);
  }

  if (options?.offset) {
    query.offset(options.offset);
  }

  const results = await query;

  return results.map(result => ({
    id: result.id,
    name: result.name,
    description: result.description || '',
    content: result.content,
    variables: result.variables as PromptTemplateVariable[],
    tags: result.tags as string[],
    isPublic: result.isPublic ?? false,
    userId: result.userId,
    organizationId: result.organizationId || undefined,
  }));
}

/**
 * List organization prompt templates
 */
export async function listOrganizationPromptTemplates(organizationId: string, options?: {
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}): Promise<PromptTemplate[]> {
  const conditions: SQL<unknown>[] = [eq(promptTemplates.organizationId, organizationId)];

  if (options?.search) {
    conditions.push(like(promptTemplates.name, `%${options.search}%`));
  }

  if (options?.tags && options.tags.length > 0) {
    conditions.push(inArray(promptTemplates.tags as unknown as SQL<string[]>, options.tags));
  }

  const query = db.select()
    .from(promptTemplates)
    .where(conditions[0])
    .orderBy(desc(promptTemplates.updatedAt));

  if (options?.limit) {
    query.limit(options.limit);
  }

  if (options?.offset) {
    query.offset(options.offset);
  }

  const results = await query;

  return results.map(result => ({
    id: result.id,
    name: result.name,
    description: result.description || '',
    content: result.content,
    variables: result.variables as PromptTemplateVariable[],
    tags: result.tags as string[],
    isPublic: result.isPublic ?? false,
    userId: result.userId,
    organizationId: result.organizationId || undefined,
  }));
}

/**
 * Apply variables to a prompt template
 */
export function applyTemplateVariables(template: PromptTemplate, variables: Record<string, string>): string {
  let content = template.content;

  // Replace variables in the format {{variable_name}}
  template.variables.forEach(variable => {
    const value = variables[variable.name] || variable.defaultValue || '';
    content = content.replace(new RegExp(`{{\\s*${variable.name}\\s*}}`, 'g'), value);
  });

  return content;
}

/**
 * Extract variables from a prompt template content
 */
export function extractTemplateVariables(content: string): string[] {
  const variableRegex = /{{(.*?)}}/g;
  const variables: string[] = [];
  let match;

  while ((match = variableRegex.exec(content)) !== null) {
    const variableName = match[1].trim();
    if (!variables.includes(variableName)) {
      variables.push(variableName);
    }
  }

  return variables;
}

/**
 * Create default prompt template variables from content
 */
export function createDefaultVariables(content: string): PromptTemplateVariable[] {
  const variableNames = extractTemplateVariables(content);
  
  return variableNames.map(name => ({
    name,
    description: `Value for ${name}`,
    required: true,
  }));
} 