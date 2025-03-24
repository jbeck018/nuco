import { z } from 'zod';
import { AIServiceError } from '../../error';

// Base schemas for common data types
export const emailSchema = z.string().email();
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/);
export const urlSchema = z.string().url();
export const dateSchema = z.string().datetime();
export const numberSchema = z.number();
export const booleanSchema = z.boolean();

// Field dependency schema
export const fieldDependencySchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan', 'exists', 'notExists']),
  value: z.unknown(),
});

// Field validation rule schema
export const fieldValidationRuleSchema = z.object({
  type: z.enum(['required', 'unique', 'format', 'range', 'custom']),
  message: z.string(),
  params: z.record(z.unknown()).optional(),
});

// Custom field schema for CRM-specific fields
export const customFieldSchema = z.object({
  name: z.string(),
  type: z.string(), // Allow any string type for flexibility
  value: z.unknown(),
  required: z.boolean().optional(),
  dependencies: z.array(fieldDependencySchema).optional(),
  validationRules: z.array(fieldValidationRuleSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Field transformation rule schema
export const fieldTransformationRuleSchema = z.object({
  type: z.enum(['trim', 'lowercase', 'uppercase', 'replace', 'format', 'custom']),
  params: z.record(z.unknown()),
});

// Base CRM record schema with custom fields
export const crmRecordSchema = z.object({
  id: z.string(),
  type: z.string(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  customFields: z.array(customFieldSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// CRM-specific schemas extending base record
export const contactSchema = crmRecordSchema.extend({
  type: z.literal('contact'),
  email: emailSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: phoneSchema.optional(),
  company: z.string().optional(),
  title: z.string().optional(),
});

export const companySchema = crmRecordSchema.extend({
  type: z.literal('company'),
  name: z.string().min(1),
  website: urlSchema.optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
});

export const dealSchema = crmRecordSchema.extend({
  type: z.literal('deal'),
  name: z.string().min(1),
  amount: numberSchema,
  stage: z.string(),
  probability: numberSchema.min(0).max(100),
  expectedCloseDate: dateSchema.optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
});

export const activitySchema = crmRecordSchema.extend({
  type: z.literal('activity'),
  subject: z.string().min(1),
  description: z.string().optional(),
  dueDate: dateSchema.optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  dealId: z.string().optional(),
});

// Generic record schema for flexible data
export const recordSchema = crmRecordSchema.extend({
  type: z.string(),
  data: z.record(z.unknown()),
});

// Schema registry for easy lookup
export const schemaRegistry = {
  contact: contactSchema,
  company: companySchema,
  deal: dealSchema,
  activity: activitySchema,
  record: recordSchema,
} as const;

export type SchemaType = keyof typeof schemaRegistry;

/**
 * Validate data against a schema
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AIServiceError(
        `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        'custom',
        'schema_validation_error'
      );
    }
    throw error;
  }
}

/**
 * Validate data against a schema with partial success
 */
export function validateDataPartial<T>(schema: z.ZodSchema<T>, data: unknown): { valid: T[]; invalid: unknown[] } {
  try {
    const valid = schema.parse(data);
    return { valid: [valid], invalid: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // For arrays, try to validate each item individually
      if (Array.isArray(data)) {
        const results = data.map(item => {
          try {
            return { valid: schema.parse(item), invalid: null };
          } catch {
            return { valid: null, invalid: item };
          }
        });

        return {
          valid: results.filter(r => r.valid !== null).map(r => r.valid as T),
          invalid: results.filter(r => r.invalid !== null).map(r => r.invalid as unknown),
        };
      }

      return { valid: [], invalid: [data] };
    }
    throw error;
  }
}

/**
 * Clean data according to schema rules
 */
export function cleanData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Attempt to clean the data
      const cleaned = { ...data as Record<string, unknown> };
      
      for (const err of error.errors) {
        const path = err.path;
        if (path.length === 1) {
          const key = path[0] as string;
          if (err.code === 'invalid_type') {
            // Handle type conversion
            if (err.expected === 'string' && typeof cleaned[key] === 'number') {
              cleaned[key] = String(cleaned[key]);
            } else if (err.expected === 'number' && typeof cleaned[key] === 'string') {
              cleaned[key] = Number(cleaned[key]);
            } else if (err.expected === 'boolean' && typeof cleaned[key] === 'string') {
              cleaned[key] = cleaned[key] === 'true';
            }
          }
        }
      }

      try {
        return schema.parse(cleaned);
      } catch {
        throw new AIServiceError(
          `Data cleaning failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          'custom',
          'data_cleaning_error'
        );
      }
    }
    throw error;
  }
} 