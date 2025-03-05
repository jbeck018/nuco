/**
 * Integration router
 * This file contains all integration-related tRPC procedures
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { db } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { IntegrationFactory } from '@/lib/integrations';

// Define the integration input schema
const integrationSchema = z.object({
  type: z.enum(['salesforce', 'hubspot', 'google', 'slack']),
  name: z.string().min(1).max(100),
  config: z.record(z.any()),
});

// Define the integration update schema
const integrationUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  config: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Integration router with all integration-related procedures
 */
export const integrationRouter = router({
  /**
   * Get all integrations for the current user
   */
  getAll: protectedProcedure
    .input(z.object({
      organizationId: z.string().uuid().optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        let userIntegrations;
        
        if (input?.organizationId) {
          // If organizationId is provided, filter integrations by organization
          userIntegrations = await db.select().from(integrations)
            .where(and(
              eq(integrations.userId, userId),
              eq(integrations.organizationId, input.organizationId)
            ));
        } else {
          // Otherwise, get all integrations for the user
          userIntegrations = await db.select().from(integrations)
            .where(eq(integrations.userId, userId));
        }
        
        return userIntegrations.map(integration => ({
          id: integration.id,
          name: integration.name,
          type: integration.type,
          status: integration.isActive ? 'connected' : 'disconnected',
          lastSynced: integration.lastSyncedAt?.toISOString() || null,
          config: integration.config,
          createdAt: integration.createdAt.toISOString(),
          updatedAt: integration.updatedAt.toISOString(),
        }));
      } catch (error) {
        console.error('Error fetching integrations:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch integrations',
        });
      }
    }),
  
  /**
   * Get a specific integration by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id } = input;
      
      try {
        const [integration] = await db.select().from(integrations)
          .where(and(
            eq(integrations.id, id),
            eq(integrations.userId, userId)
          ));
        
        if (!integration) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Integration not found',
          });
        }
        
        return {
          id: integration.id,
          name: integration.name,
          type: integration.type,
          status: integration.isActive ? 'connected' : 'disconnected',
          lastSynced: integration.lastSyncedAt?.toISOString() || null,
          config: integration.config,
          createdAt: integration.createdAt.toISOString(),
          updatedAt: integration.updatedAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error fetching integration:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch integration',
        });
      }
    }),
  
  /**
   * Create a new integration
   */
  create: protectedProcedure
    .input(integrationSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { type, name, config } = input;
      
      try {
        // Validate that the integration type is supported
        try {
          IntegrationFactory.createIntegration(type);
        } catch {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Unsupported integration type: ${type}`,
          });
        }
        
        // Create the integration
        const [newIntegration] = await db.insert(integrations)
          .values({
            userId,
            type,
            name,
            config,
            isActive: true,
          })
          .returning();
        
        return {
          id: newIntegration.id,
          name: newIntegration.name,
          type: newIntegration.type,
          status: 'connected',
          config: newIntegration.config,
          createdAt: newIntegration.createdAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error creating integration:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create integration',
        });
      }
    }),
  
  /**
   * Update an integration
   */
  update: protectedProcedure
    .input(integrationUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id, ...updateData } = input;
      
      try {
        // Check if the integration exists and belongs to the user
        const [existingIntegration] = await db.select().from(integrations)
          .where(and(
            eq(integrations.id, id),
            eq(integrations.userId, userId)
          ));
        
        if (!existingIntegration) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Integration not found',
          });
        }
        
        // Update the integration
        const [updatedIntegration] = await db.update(integrations)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(integrations.id, id))
          .returning();
        
        return {
          id: updatedIntegration.id,
          name: updatedIntegration.name,
          type: updatedIntegration.type,
          status: updatedIntegration.isActive ? 'connected' : 'disconnected',
          config: updatedIntegration.config,
          updatedAt: updatedIntegration.updatedAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error updating integration:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update integration',
        });
      }
    }),
  
  /**
   * Disconnect an integration
   */
  disconnect: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id } = input;
      
      try {
        // Check if the integration exists and belongs to the user
        const [existingIntegration] = await db.select().from(integrations)
          .where(and(
            eq(integrations.id, id),
            eq(integrations.userId, userId)
          ));
        
        if (!existingIntegration) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Integration not found',
          });
        }
        
        // Update the integration to set isActive to false
        await db.update(integrations)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(integrations.id, id));
        
        return {
          success: true,
          message: 'Integration disconnected successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error disconnecting integration:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to disconnect integration',
        });
      }
    }),
  
  /**
   * Delete an integration
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id } = input;
      
      try {
        // Check if the integration exists and belongs to the user
        const [existingIntegration] = await db.select().from(integrations)
          .where(and(
            eq(integrations.id, id),
            eq(integrations.userId, userId)
          ));
        
        if (!existingIntegration) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Integration not found',
          });
        }
        
        // Delete the integration
        await db.delete(integrations)
          .where(eq(integrations.id, id));
        
        return {
          success: true,
          message: 'Integration deleted successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error deleting integration:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete integration',
        });
      }
    }),
  
  /**
   * Sync an integration
   */
  sync: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id } = input;
      
      try {
        // Check if the integration exists and belongs to the user
        const [existingIntegration] = await db.select().from(integrations)
          .where(and(
            eq(integrations.id, id),
            eq(integrations.userId, userId)
          ));
        
        if (!existingIntegration) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Integration not found',
          });
        }
        
        // Check if the integration is active
        if (!existingIntegration.isActive) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot sync a disconnected integration',
          });
        }
        
        // Create an instance of the integration
        // We're creating the instance to validate it exists, but not using it yet
        IntegrationFactory.createIntegration(existingIntegration.type);
        
        // TODO: Implement actual sync logic with the integration instance
        // For now, we'll just update the lastSyncedAt timestamp
        
        // Update the lastSyncedAt timestamp
        const now = new Date();
        const [updatedIntegration] = await db.update(integrations)
          .set({
            lastSyncedAt: now,
            updatedAt: now,
          })
          .where(eq(integrations.id, id))
          .returning();
        
        return {
          success: true,
          message: 'Integration synced successfully',
          lastSynced: updatedIntegration.lastSyncedAt?.toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error syncing integration:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync integration',
        });
      }
    }),
    
  /**
   * Get available integration types
   */
  getAvailableTypes: protectedProcedure.query(() => {
    try {
      const types = IntegrationFactory.getAvailableIntegrations();
      
      return types.map(type => ({
        type,
        ...IntegrationFactory.getIntegrationDetails(type),
      }));
    } catch (error) {
      console.error('Error fetching integration types:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch integration types',
      });
    }
  }),
}); 