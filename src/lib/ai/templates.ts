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
 * Extended prompt template variable schema with formatting options
 */
export const promptTemplateVariableSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  defaultValue: z.string().optional(),
  required: z.boolean().default(false),
  type: z.enum(['string', 'number', 'boolean', 'date', 'array']).default('string'),
  format: z.object({
    case: z.enum(['upper', 'lower', 'title', 'sentence', 'none']).optional(),
    dateFormat: z.string().optional(),
    numberFormat: z.string().optional(),
    arrayJoin: z.string().optional(),
    truncate: z.number().optional(),
    transform: z.enum(['json', 'html', 'markdown', 'csv', 'none']).optional(),
  }).optional(),
  options: z.array(z.string()).optional(), // Possible values for selection
  validation: z.object({
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    enum: z.array(z.string()).optional(),
  }).optional(),
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
 * JSON-compatible value type
 */
export type JsonValue = 
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

/**
 * Template variable value type
 */
export type TemplateVariableValue = 
  | string
  | number
  | boolean
  | Date
  | string[]
  | number[]
  | Record<string, JsonValue>
  | null
  | undefined;

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
 * Apply variables to a prompt template with advanced formatting options
 */
export function applyTemplateVariables(template: PromptTemplate, variables: Record<string, TemplateVariableValue>): string {
  let content = template.content;

  // Process conditional blocks first
  content = processConditionalBlocks(content, variables);
  
  // Replace regular variables with formatting options
  for (const variable of template.variables) {
    const value = variables[variable.name] !== undefined 
      ? variables[variable.name] 
      : variable.defaultValue || '';
    
    const formattedValue = formatVariableValue(value, variable);
    content = content.replace(new RegExp(`{{\\s*${variable.name}\\s*}}`, 'g'), formattedValue);
    
    // Also replace variables with format specifiers {{var:format}}
    const formatRegex = new RegExp(`{{\\s*${variable.name}\\s*:\\s*([a-z]+)\\s*}}`, 'g');
    let match;
    while ((match = formatRegex.exec(content)) !== null) {
      const format = match[1];
      const formattedWithOverride = formatWithOverride(value, format, variable);
      content = content.replace(match[0], formattedWithOverride);
    }
  }

  // Replace any remaining variables with empty strings (for optional variables)
  content = content.replace(/{{(\s*[\w:]+\s*)}}/g, '');

  return content;
}

/**
 * Format a variable value based on the variable configuration
 */
function formatVariableValue(value: TemplateVariableValue, variable: PromptTemplateVariable): string {
  if (value === undefined || value === null) {
    return '';
  }
  
  // Handle different variable types
  switch (variable.type) {
    case 'array':
      if (Array.isArray(value)) {
        // Join array with delimiter if specified
        const delimiter = variable.format?.arrayJoin || ', ';
        value = value.join(delimiter);
      } else {
        // Attempt to parse JSON if value is a string
        try {
          if (typeof value === 'string' && value.startsWith('[')) {
            const parsedArray = JSON.parse(value);
            if (Array.isArray(parsedArray)) {
              const delimiter = variable.format?.arrayJoin || ', ';
              value = parsedArray.join(delimiter);
            }
          }
        } catch {
          // If parsing fails, use as is
        }
      }
      break;
      
    case 'date':
      // Format date using specified format or ISO string
      if (value instanceof Date) {
        if (variable.format?.dateFormat) {
          // Simple date formatting - for more complex format use a library like date-fns
          try {
            const options: Intl.DateTimeFormatOptions = { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            };
            value = value.toLocaleDateString(undefined, options);
          } catch {
            if (value instanceof Date) {
              value = value.toISOString();
            } else {
              value = String(value);
            }
          }
        } else {
          value = value.toISOString();
        }
      } else if (typeof value === 'string' || typeof value === 'number') {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            if (variable.format?.dateFormat) {
              const options: Intl.DateTimeFormatOptions = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              };
              value = date.toLocaleDateString(undefined, options);
            } else {
              value = date.toISOString();
            }
          }
        } catch {
          // If parsing fails, use as is
        }
      }
      break;
      
    case 'number':
      // Format number using specified format
      if (typeof value === 'number' || !isNaN(Number(value))) {
        const num = typeof value === 'number' ? value : Number(value);
        if (variable.format?.numberFormat) {
          try {
            // Use Intl.NumberFormat for formatting
            const formatter = new Intl.NumberFormat(undefined, {
              style: variable.format.numberFormat === 'currency' ? 'currency' : 'decimal',
              currency: variable.format.numberFormat === 'currency' ? 'USD' : undefined,
              minimumFractionDigits: 0,
              maximumFractionDigits: 2
            });
            value = formatter.format(num);
          } catch {
            value = num.toString();
          }
        } else {
          value = num.toString();
        }
      }
      break;
      
    case 'boolean':
      // Format boolean
      if (typeof value === 'boolean') {
        value = value ? 'true' : 'false';
      } else if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (['true', 'yes', '1'].includes(lowerValue)) {
          value = 'true';
        } else if (['false', 'no', '0'].includes(lowerValue)) {
          value = 'false';
        }
      }
      break;
  }
  
  // Convert to string
  value = String(value);
  
  // Apply case formatting
  if (variable.format?.case) {
    switch (variable.format.case) {
      case 'upper':
        value = value.toUpperCase();
        break;
      case 'lower':
        value = value.toLowerCase();
        break;
      case 'title':
        value = value
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        break;
      case 'sentence':
        value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        break;
    }
  }
  
  // Apply truncation
  if (variable.format?.truncate && value.length > variable.format.truncate) {
    value = value.substring(0, variable.format.truncate) + '...';
  }
  
  // Apply transformation
  if (variable.format?.transform) {
    switch (variable.format.transform) {
      case 'json':
        try {
          const obj = typeof value === 'string' ? JSON.parse(value) : value;
          value = JSON.stringify(obj, null, 2);
        } catch {
          // If parsing fails, use as is
        }
        break;
      case 'html':
        // Simple escaping - for more complex HTML formatting use a library
        value = value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        break;
      case 'markdown':
        // Simple escaping for markdown - for more complex MD formatting use a library
        value = value
          .replace(/\*/g, '\\*')
          .replace(/_/g, '\\_')
          .replace(/\[/g, '\\[')
          .replace(/\]/g, '\\]');
        break;
      case 'csv':
        // Simple CSV escaping
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        break;
    }
  }
  
  return value;
}

/**
 * Format a value with an override format specifier
 */
function formatWithOverride(value: TemplateVariableValue, format: string, variable: PromptTemplateVariable): string {
  // Create a variable with format override
  const overrideVariable: PromptTemplateVariable = {
    ...variable,
    format: {
      ...variable.format,
    }
  };
  
  // Apply the override format
  switch (format) {
    case 'upper':
    case 'lowercase':
    case 'title':
    case 'sentence':
      overrideVariable.format = { 
        ...overrideVariable.format, 
        case: format as 'upper' | 'lower' | 'title' | 'sentence' | 'none' 
      };
      break;
    case 'json':
    case 'html':
    case 'markdown':
    case 'csv':
      overrideVariable.format = { 
        ...overrideVariable.format, 
        transform: format as 'json' | 'html' | 'markdown' | 'csv' | 'none' 
      };
      break;
    case 'date':
      overrideVariable.type = 'date';
      break;
    case 'number':
      overrideVariable.type = 'number';
      break;
    case 'boolean':
      overrideVariable.type = 'boolean';
      break;
    case 'array':
      overrideVariable.type = 'array';
      break;
  }
  
  return formatVariableValue(value, overrideVariable);
}

/**
 * Process conditional blocks in templates
 */
function processConditionalBlocks(content: string, variables: Record<string, TemplateVariableValue>): string {
  // Match {{#if var}}...{{/if}} or {{#if var}}...{{else}}...{{/if}}
  const conditionalRegex = /{{#if\s+([^}]+)\s*}}([\s\S]*?)(?:{{else}}([\s\S]*?))?{{\/if}}/g;
  
  return content.replace(conditionalRegex, (match, condition, ifContent, elseContent = '') => {
    // Extract variable name and possible operator/value
    const parts = condition.trim().split(/\s+/);
    let variableName = parts[0];
    let operator = parts.length > 1 ? parts[1] : '==';
    const compareValue = parts.length > 2 ? parts.slice(2).join(' ') : 'true';
    
    // Handle negation
    if (variableName.startsWith('!')) {
      variableName = variableName.substring(1);
      operator = operator === '==' ? '!=' : '==';
    }
    
    // Get the variable value
    const value = variables[variableName];
    let result = false;
    
    // Evaluate the condition
    switch (operator) {
      case '==':
        result = value == compareValue;
        break;
      case '!=':
        result = value != compareValue;
        break;
      case '>':
        result = Number(value) > Number(compareValue);
        break;
      case '<':
        result = Number(value) < Number(compareValue);
        break;
      case '>=':
        result = Number(value) >= Number(compareValue);
        break;
      case '<=':
        result = Number(value) <= Number(compareValue);
        break;
      default:
        // For unknown operators, just check if the value is truthy
        result = !!value;
    }
    
    // Return the appropriate content based on the condition
    return result ? ifContent : elseContent;
  });
}

/**
 * Extract variables from a prompt template content, including format specifiers
 */
export function extractTemplateVariables(content: string): string[] {
  // Match both {{var}} and {{var:format}}
  const variableRegex = /{{(?:#if\s+)?([^}:#/]+)(?::[^}]+)?}}/g;
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
    type: 'string'
  }));
} 