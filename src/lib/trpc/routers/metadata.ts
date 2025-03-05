/**
 * metadata.ts
 * 
 * This file defines the tRPC router for metadata-related operations.
 * It provides type-safe API routes for managing user preferences and settings.
 */
import { z } from 'zod';
import { protectedProcedure, router } from '@/lib/trpc/server';
import * as metadataService from '@/lib/metadata/service';
import { TRPCError } from '@trpc/server';
import {
  insertUserPreferencesSchema,
  insertOrganizationSettingsSchema,
  insertIntegrationSettingsSchema,
} from '@/lib/db/schema/metadata';

// Input validation schemas
const entityMetadataSchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  key: z.string(),
  value: z.record(z.any()),
});

const getMetadataSchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  key: z.string(),
});

const getAllMetadataSchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
});

const userIdSchema = z.object({
  userId: z.string().uuid(),
});

const organizationIdSchema = z.object({
  organizationId: z.string().uuid(),
});

const integrationIdSchema = z.object({
  integrationId: z.string().uuid(),
});

// Create the router
export const metadataRouter = router({
  /**
   * Generic metadata operations
   */
  
  // Get metadata
  getMetadata: protectedProcedure
    .input(getMetadataSchema)
    .query(async ({ input }) => {
      return metadataService.getMetadata(
        input.entityType,
        input.entityId,
        input.key
      );
    }),
  
  // Get all metadata for an entity
  getAllMetadata: protectedProcedure
    .input(getAllMetadataSchema)
    .query(async ({ input }) => {
      return metadataService.getAllMetadata(
        input.entityType,
        input.entityId
      );
    }),
  
  // Set metadata
  setMetadata: protectedProcedure
    .input(entityMetadataSchema)
    .mutation(async ({ input }) => {
      const result = await metadataService.setMetadata({
        entityType: input.entityType,
        entityId: input.entityId,
        key: input.key,
        value: input.value,
      });
      
      if (!result.length) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to set metadata',
        });
      }
      
      return result[0];
    }),
  
  // Delete metadata
  deleteMetadata: protectedProcedure
    .input(getMetadataSchema)
    .mutation(async ({ input }) => {
      const result = await metadataService.deleteMetadata(
        input.entityType,
        input.entityId,
        input.key
      );
      
      if (!result.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Metadata not found',
        });
      }
      
      return result[0];
    }),
  
  // Delete all metadata for an entity
  deleteAllMetadata: protectedProcedure
    .input(getAllMetadataSchema)
    .mutation(async ({ input }) => {
      return metadataService.deleteAllMetadata(
        input.entityType,
        input.entityId
      );
    }),
  
  /**
   * User preferences operations
   */
  
  // Get user preferences
  getUserPreferences: protectedProcedure
    .input(userIdSchema)
    .query(async ({ input }) => {
      return metadataService.getUserPreferences(input.userId);
    }),
  
  // Get current user's preferences
  getMyPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }
      
      return metadataService.getUserPreferences(ctx.session.user.id);
    }),
  
  // Set user preferences
  setUserPreferences: protectedProcedure
    .input(insertUserPreferencesSchema.omit({ id: true, createdAt: true, updatedAt: true }))
    .mutation(async ({ input }) => {
      // Convert the input to match the expected NewUserPreferences type
      const newUserPreferences = {
        userId: input.userId,
        theme: input.theme,
        timezone: input.timezone,
        locale: input.locale,
        notifications: input.notifications,
        dashboardLayout: input.dashboardLayout ? {
          widgets: input.dashboardLayout.widgets
        } : undefined,
        customization: input.customization
      };
      
      const result = await metadataService.setUserPreferences(newUserPreferences);
      
      if (!result.length) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to set user preferences',
        });
      }
      
      return result[0];
    }),
  
  // Update current user's preferences
  updateMyPreferences: protectedProcedure
    .input(z.object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      timezone: z.string().optional(),
      locale: z.string().optional(),
      notifications: z.object({
        email: z.boolean(),
        inApp: z.boolean(),
        marketingEmails: z.boolean(),
        slackMessages: z.boolean(),
      }).optional(),
      customization: z.object({
        accentColor: z.string().optional(),
        fontSize: z.enum(['small', 'medium', 'large']).optional(),
        compactMode: z.boolean().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }
      
      const result = await metadataService.updateUserPreferences(
        ctx.session.user.id,
        input
      );
      
      if (!result.length) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user preferences',
        });
      }
      
      return result[0];
    }),
  
  /**
   * Organization settings operations
   */
  
  // Get organization settings
  getOrganizationSettings: protectedProcedure
    .input(organizationIdSchema)
    .query(async ({ input }) => {
      return metadataService.getOrganizationSettings(input.organizationId);
    }),
  
  // Set organization settings
  setOrganizationSettings: protectedProcedure
    .input(insertOrganizationSettingsSchema.omit({ id: true, createdAt: true, updatedAt: true }))
    .mutation(async ({ input }) => {
      // Convert the input to match the expected NewOrganizationSettings type
      const newOrganizationSettings = {
        organizationId: input.organizationId,
        defaultIntegrations: input.defaultIntegrations,
        memberDefaultRole: input.memberDefaultRole,
        slackSettings: input.slackSettings,
        aiSettings: input.aiSettings
      };
      
      const result = await metadataService.setOrganizationSettings(newOrganizationSettings);
      
      if (!result.length) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to set organization settings',
        });
      }
      
      return result[0];
    }),
  
  // Update organization settings
  updateOrganizationSettings: protectedProcedure
    .input(z.object({
      organizationId: z.string().uuid(),
      defaultIntegrations: z.array(z.string()).optional(),
      memberDefaultRole: z.enum(['member', 'admin']).optional(),
      slackSettings: z.object({
        notifyOnNewMembers: z.boolean().optional(),
        notifyOnIntegrationChanges: z.boolean().optional(),
        defaultChannels: z.array(z.string()).optional(),
        webhookUrl: z.string().optional(),
      }).optional(),
      aiSettings: z.object({
        defaultModel: z.string().optional(),
        maxTokensPerRequest: z.number().optional(),
        promptTemplates: z.array(z.object({
          id: z.string(),
          name: z.string(),
          isDefault: z.boolean().optional(),
        })).optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const { organizationId, ...data } = input;
      
      const result = await metadataService.updateOrganizationSettings(
        organizationId,
        data
      );
      
      if (!result.length) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update organization settings',
        });
      }
      
      return result[0];
    }),
  
  /**
   * Integration settings operations
   */
  
  // Get integration settings
  getIntegrationSettings: protectedProcedure
    .input(integrationIdSchema)
    .query(async ({ input }) => {
      return metadataService.getIntegrationSettings(input.integrationId);
    }),
  
  // Set integration settings
  setIntegrationSettings: protectedProcedure
    .input(insertIntegrationSettingsSchema.omit({ id: true, createdAt: true, updatedAt: true }))
    .mutation(async ({ input }) => {
      // Convert the input to match the expected NewIntegrationSettings type
      const newIntegrationSettings = {
        integrationId: input.integrationId,
        syncFrequency: input.syncFrequency,
        syncSettings: input.syncSettings,
        webhookSettings: input.webhookSettings,
        apiSettings: input.apiSettings
      };
      
      const result = await metadataService.setIntegrationSettings(newIntegrationSettings);
      
      if (!result.length) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to set integration settings',
        });
      }
      
      return result[0];
    }),
  
  // Update integration settings
  updateIntegrationSettings: protectedProcedure
    .input(z.object({
      integrationId: z.string().uuid(),
      syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'weekly']).optional(),
      syncSettings: z.object({
        lastSyncTime: z.string().optional(),
        objectsToSync: z.array(z.string()).optional(),
        fieldMappings: z.record(z.string()).optional(),
      }).optional(),
      webhookSettings: z.object({
        enabled: z.boolean().optional(),
        events: z.array(z.string()).optional(),
        url: z.string().url().optional(),
        secret: z.string().optional(),
      }).optional(),
      apiSettings: z.object({
        rateLimit: z.number().optional(),
        timeout: z.number().optional(),
        retryPolicy: z.object({
          maxRetries: z.number(),
          backoffFactor: z.number(),
        }).optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const { integrationId, ...data } = input;
      
      const result = await metadataService.updateIntegrationSettings(
        integrationId,
        data
      );
      
      if (!result.length) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update integration settings',
        });
      }
      
      return result[0];
    }),
}); 