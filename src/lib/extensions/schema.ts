/**
 * Extension Manifest Schema
 * 
 * This file defines the schema for extension manifests using Zod.
 * It provides validation and type inference for extension manifests.
 */

import { z } from 'zod';

/**
 * Author schema
 */
export const authorSchema = z.object({
  name: z.string().min(1, 'Author name is required'),
  email: z.string().email('Invalid email address').optional(),
  url: z.string().url('Invalid URL').optional(),
});

/**
 * Entry points schema
 */
export const entryPointsSchema = z.object({
  main: z.string().min(1, 'Main entry point is required'),
  settings: z.string().optional(),
  background: z.string().optional(),
});

/**
 * Permission schema
 */
export const permissionSchema = z.enum([
  'storage',
  'network',
  'slack:read',
  'slack:write',
  'salesforce:read',
  'salesforce:write',
  'chrome:tabs',
  'chrome:storage',
  'chrome:notifications',
]);

/**
 * Setting schema
 */
export const settingSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'select']),
  description: z.string().optional(),
  default: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
  required: z.boolean().default(false),
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).optional(),
});

/**
 * Settings schema
 */
export const settingsSchema = z.object({
  configurable: z.boolean().default(true),
  schema: z.record(z.string(), settingSchema),
});

/**
 * Hook schema
 */
export const hookSchema = z.object({
  event: z.string().min(1, 'Event name is required'),
  handler: z.string().min(1, 'Handler name is required'),
});

/**
 * Extension type schema
 */
export const extensionTypeSchema = z.enum([
  'slack',
  'chrome',
  'salesforce',
  'api',
]);

/**
 * Extension manifest schema
 */
export const extensionManifestSchema = z.object({
  name: z.string().min(1, 'Extension name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., 1.0.0)'),
  description: z.string().optional(),
  author: authorSchema,
  type: extensionTypeSchema,
  entryPoints: entryPointsSchema,
  permissions: z.array(permissionSchema).default([]),
  settings: settingsSchema.optional(),
  hooks: z.array(hookSchema).default([]),
});

/**
 * Extension manifest type
 */
export type ExtensionManifest = z.infer<typeof extensionManifestSchema>;

/**
 * Validate an extension manifest
 * @param manifest The manifest to validate
 * @returns The validated manifest or throws an error
 */
export function validateManifest(manifest: unknown): ExtensionManifest {
  return extensionManifestSchema.parse(manifest);
}

/**
 * Validate an extension manifest and return validation errors
 * @param manifest The manifest to validate
 * @returns The validation result
 */
export function validateManifestSafe(manifest: unknown): { 
  success: boolean; 
  data?: ExtensionManifest; 
  errors?: z.ZodError 
} {
  try {
    const data = extensionManifestSchema.parse(manifest);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
} 