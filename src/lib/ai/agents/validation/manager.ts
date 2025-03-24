import { z } from 'zod';
import { AIServiceError } from '../../error';
import {
  SchemaType,
  schemaRegistry,
  validateData,
  validateDataPartial,
  cleanData,
  customFieldSchema,
  crmRecordSchema,
  fieldDependencySchema,
  fieldValidationRuleSchema,
  fieldTransformationRuleSchema,
} from './schema';

export interface ValidationConfig {
  schema: SchemaType;
  strict?: boolean;
  clean?: boolean;
  partial?: boolean;
  customRules?: z.ZodSchema[];
  customFields?: z.ZodSchema[];
  allowUnknownFields?: boolean;
  transformations?: typeof fieldTransformationRuleSchema[];
}

export interface ValidationResult<T> {
  valid: T[];
  invalid: unknown[];
  cleaned: T[];
  errors: string[];
  customFields?: unknown[];
  transformations?: Record<string, unknown>[];
}

export class ValidationManager {
  private config: ValidationConfig;
  private customSchema?: z.ZodSchema;

  constructor(config: ValidationConfig) {
    this.config = {
      strict: true,
      clean: false,
      partial: false,
      allowUnknownFields: false,
      ...config,
    };

    // Create custom schema if custom fields are provided
    if (config.customFields?.length) {
      this.customSchema = crmRecordSchema.extend({
        customFields: z.array(customFieldSchema),
      });
    }
  }

  /**
   * Validate data according to configuration
   */
  validate<T>(data: unknown): ValidationResult<T> {
    const schema = this.customSchema || schemaRegistry[this.config.schema];
    const result: ValidationResult<T> = {
      valid: [],
      invalid: [],
      cleaned: [],
      errors: [],
    };

    try {
      // Apply transformations if configured
      if (this.config.transformations?.length) {
        const transformed = this.applyTransformations(data);
        result.transformations = transformed;
        data = transformed[transformed.length - 1];
      }

      if (Array.isArray(data)) {
        return this.validateArray<T>(data);
      }

      if (this.config.partial) {
        const { valid, invalid } = validateDataPartial<T>(schema, data);
        result.valid = valid;
        result.invalid = invalid;
      } else if (this.config.clean) {
        try {
          const cleaned = cleanData<T>(schema, data);
          result.cleaned.push(cleaned);
        } catch (error) {
          if (error instanceof AIServiceError) {
            result.errors.push(error.message);
          }
          result.invalid.push(data);
        }
      } else {
        try {
          const validated = validateData<T>(schema, data);
          result.valid.push(validated);
        } catch (error) {
          if (error instanceof AIServiceError) {
            result.errors.push(error.message);
          }
          result.invalid.push(data);
        }
      }

      // Extract and validate custom fields if present
      if (typeof data === 'object' && data !== null) {
        const record = data as Record<string, unknown>;
        if ('customFields' in record) {
          result.customFields = this.validateCustomFields(record.customFields as unknown[]);
        }
      }
    } catch (error) {
      if (error instanceof AIServiceError) {
        result.errors.push(error.message);
      }
      result.invalid.push(data);
    }

    return result;
  }

  /**
   * Validate an array of data
   */
  private validateArray<T>(data: unknown[]): ValidationResult<T> {
    const result: ValidationResult<T> = {
      valid: [],
      invalid: [],
      cleaned: [],
      errors: [],
    };

    for (const item of data) {
      const itemResult = this.validate<T>(item);
      result.valid.push(...itemResult.valid);
      result.invalid.push(...itemResult.invalid);
      result.cleaned.push(...itemResult.cleaned);
      result.errors.push(...itemResult.errors);
      if (itemResult.customFields) {
        result.customFields = result.customFields || [];
        result.customFields.push(...itemResult.customFields);
      }
      if (itemResult.transformations) {
        result.transformations = result.transformations || [];
        result.transformations.push(...itemResult.transformations);
      }
    }

    return result;
  }

  /**
   * Apply custom validation rules
   */
  applyCustomRules<T>(data: T): T {
    if (!this.config.customRules) {
      return data;
    }

    for (const rule of this.config.customRules) {
      try {
        rule.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new AIServiceError(
            `Custom validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
            'custom',
            'custom_validation_error'
          );
        }
        throw error;
      }
    }

    return data;
  }

  /**
   * Apply field transformations
   */
  private applyTransformations(data: unknown): Record<string, unknown>[] {
    if (!this.config.transformations?.length) {
      return [];
    }

    const results: Record<string, unknown>[] = [data as Record<string, unknown>];
    let current = { ...data as Record<string, unknown> };

    for (const transform of this.config.transformations) {
      const transformed = this.applyTransformation(current, transform.parse({}));
      results.push(transformed);
      current = transformed;
    }

    return results;
  }

  /**
   * Apply a single transformation
   */
  private applyTransformation(data: Record<string, unknown>, transform: z.infer<typeof fieldTransformationRuleSchema>): Record<string, unknown> {
    const result = { ...data };

    switch (transform.type) {
      case 'trim':
        for (const [key, value] of Object.entries(result)) {
          if (typeof value === 'string') {
            result[key] = value.trim();
          }
        }
        break;
      case 'lowercase':
        for (const [key, value] of Object.entries(result)) {
          if (typeof value === 'string') {
            result[key] = value.toLowerCase();
          }
        }
        break;
      case 'uppercase':
        for (const [key, value] of Object.entries(result)) {
          if (typeof value === 'string') {
            result[key] = value.toUpperCase();
          }
        }
        break;
      case 'replace':
        for (const [key, value] of Object.entries(result)) {
          if (typeof value === 'string') {
            const { search, replace } = transform.params as { search: string; replace: string };
            result[key] = value.replace(new RegExp(search), replace);
          }
        }
        break;
      case 'format':
        for (const [key, value] of Object.entries(result)) {
          if (typeof value === 'string') {
            const { format } = transform.params as { format: string };
            // Add format-specific transformations here
            result[key] = value;
          }
        }
        break;
      case 'custom':
        const { transformFn } = transform.params as { transformFn: (data: Record<string, unknown>) => Record<string, unknown> };
        return transformFn(result);
    }

    return result;
  }

  /**
   * Validate custom fields
   */
  private validateCustomFields(fields: unknown[]): unknown[] {
    return fields.filter(field => {
      try {
        const validated = customFieldSchema.parse(field);
        
        // Check dependencies
        if (validated.dependencies?.length) {
          for (const dep of validated.dependencies) {
            if (!this.checkDependency(dep)) {
              return false;
            }
          }
        }

        // Check validation rules
        if (validated.validationRules?.length) {
          for (const rule of validated.validationRules) {
            if (!this.checkValidationRule(validated, rule)) {
              return false;
            }
          }
        }

        return true;
      } catch {
        return false;
      }
    });
  }

  /**
   * Check a field dependency
   */
  private checkDependency(dep: z.infer<typeof fieldDependencySchema>): boolean {
    // Implementation depends on the context and available data
    // This is a placeholder that should be implemented based on your needs
    return true;
  }

  /**
   * Check a validation rule
   */
  private checkValidationRule(field: z.infer<typeof customFieldSchema>, rule: z.infer<typeof fieldValidationRuleSchema>): boolean {
    // Implementation depends on the context and available data
    // This is a placeholder that should be implemented based on your needs
    return true;
  }
} 