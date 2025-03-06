import { z } from 'zod';

// Define a more specific type for JSON values
export type JsonValue = 
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

// Define specific types for user preferences
export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  marketingEmails: boolean;
  slackMessages: boolean;
}

export interface DashboardWidget {
  id: string;
  type: string;
  position: { x: number; y: number; w: number; h: number };
  settings?: Record<string, JsonValue>;
}

export interface DashboardLayout {
  widgets: DashboardWidget[];
}

export interface UserCustomization {
  accentColor?: string;
  fontSize?: 'small' | 'medium' | 'large';
  compactMode?: boolean;
}

// Define specific types for organization settings
export interface SlackSettings {
  notifyOnNewMembers?: boolean;
  notifyOnIntegrationChanges?: boolean;
  defaultChannels?: string[];
  webhookUrl?: string;
}

/**
 * Enhanced AI settings interface for both organization and user-level preferences
 */
export interface AiSettings {
  defaultModel: string;
  maxTokensPerRequest: number;
  promptTemplates: Array<{ id: string; name: string; isDefault?: boolean }>;
  contextSettings?: {
    includeUserHistory: boolean;
    includeOrganizationData: boolean;
    contextWindowSize: number;
  };
}



// Define specific types for integration settings
export interface SyncSettings {
  lastSyncTime?: string;
  objectsToSync?: string[];
  fieldMappings?: Record<string, string>;
}

export interface WebhookSettings {
  enabled?: boolean;
  events?: string[];
  url?: string;
  secret?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffFactor: number;
}

export interface ApiSettings {
  rateLimit?: number;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

// Manually define schemas to avoid deep type instantiation issues
export const insertUserPreferencesSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  theme: z.string().optional().default('system'),
  timezone: z.string().optional().default('UTC'),
  locale: z.string().optional().default('en-US'),
  notifications: z.object({
    email: z.boolean(),
    inApp: z.boolean(),
    marketingEmails: z.boolean(),
    slackMessages: z.boolean(),
  }).default({
    email: true,
    inApp: true,
    marketingEmails: false,
    slackMessages: true,
  }),
  dashboardLayout: z.object({
    widgets: z.array(z.object({
      id: z.string(),
      type: z.string(),
      position: z.object({
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
      }),
      settings: z.record(z.any()).optional(),
    }))
  }).optional(),
  customization: z.object({
    accentColor: z.string().optional(),
    fontSize: z.enum(['small', 'medium', 'large']).optional(),
    compactMode: z.boolean().optional(),
  }).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Manually define organization settings schema
export const insertOrganizationSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  defaultIntegrations: z.array(z.string()).optional().nullable(),
  memberDefaultRole: z.string().default('member'),
  slackSettings: z.object({
    notifyOnNewMembers: z.boolean().optional(),
    notifyOnIntegrationChanges: z.boolean().optional(),
    defaultChannels: z.array(z.string()).optional(),
    webhookUrl: z.string().optional(),
  }).optional().nullable(),
  aiSettings: z.object({
    defaultModel: z.string(),
    maxTokensPerRequest: z.number(),
    promptTemplates: z.array(z.object({
      id: z.string(),
      name: z.string(),
      isDefault: z.boolean().optional(),
    })),
    contextSettings: z.object({
      includeUserHistory: z.boolean(),
      includeOrganizationData: z.boolean(),
      contextWindowSize: z.number(),
    }).optional(),
  }).optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Manually define integration settings schema
export const insertIntegrationSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  integrationId: z.string().uuid(),
  syncFrequency: z.string().default('hourly'),
  syncSettings: z.object({
    lastSyncTime: z.string().optional(),
    objectsToSync: z.array(z.string()).optional(),
    fieldMappings: z.record(z.string()).optional(),
  }).optional().nullable(),
  webhookSettings: z.object({
    enabled: z.boolean().optional(),
    events: z.array(z.string()).optional(),
    url: z.string().optional(),
    secret: z.string().optional(),
  }).optional().nullable(),
  apiSettings: z.object({
    rateLimit: z.number().optional(),
    timeout: z.number().optional(),
    retryPolicy: z.object({
      maxRetries: z.number(),
      backoffFactor: z.number(),
    }).optional(),
  }).optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Metadata key schema for the flexible metadata system
export const metadataKeySchema = z.enum([
  'userPreferences',
  'organizationSettings',
  'aiSettings',
  'integrationSettings'
]);

export type MetadataKey = z.infer<typeof metadataKeySchema>;

// Base schema for all metadata entries in the flexible system
export const metadataSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  key: metadataKeySchema,
  value: z.any(),
  createdAt: z.date(),
  updatedAt: z.date(),
});