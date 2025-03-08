/**
 * AI Router
 * 
 * This file contains the tRPC router for AI-related functionality.
 * It provides procedures for managing conversations, messages, and generating completions.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { uuidv4 } from '@/lib/utils/edge-crypto';
import { protectedProcedure, router } from '@/lib/trpc/server';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { aiProviderEnum, availableModels, DEFAULT_MODEL_ID } from '@/lib/ai/config';
import { countTokens } from '@/lib/ai/service';

/**
 * Schema for creating a new conversation
 */
const conversationCreateSchema = z.object({
  title: z.string().min(1).max(100),
});

/**
 * Schema for updating a conversation
 */
const conversationUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
});

/**
 * Schema for adding a message to a conversation
 */
const messageCreateSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']),
  modelId: z.string().optional(),
});

/**
 * Schema for generating a completion
 */
export const completionSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1),
  systemPrompt: z.string().optional(),
  modelId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(0).max(2).optional(),
  presencePenalty: z.number().min(0).max(2).optional(),
  maxTokens: z.number().optional(),
});

/**
 * AI router
 */
export const aiRouter = router({
  /**
   * Get available AI models
   */
  getModels: protectedProcedure.query(() => {
    return availableModels.map(model => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
    }));
  }),

  /**
   * Get available AI providers
   */
  getProviders: protectedProcedure.query(() => {
    return aiProviderEnum.options;
  }),

  /**
   * Get all conversations for the current user
   */
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    try {
      const userConversations = await db.query.conversations.findMany({
        where: eq(conversations.userId, userId),
        orderBy: [desc(conversations.updatedAt)],
        with: {
          messages: {
            limit: 1,
            orderBy: [desc(messages.createdAt)],
          },
        },
      });

      return userConversations.map(conversation => ({
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        lastMessageAt: conversation.lastMessageAt.toISOString(),
        lastMessage: conversation.messages[0]?.content || null,
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch conversations',
      });
    }
  }),

  /**
   * Get a conversation by ID
   */
  getConversation: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const conversation = await db.query.conversations.findFirst({
          where: and(
            eq(conversations.id, input.id),
            eq(conversations.userId, userId)
          ),
          with: {
            messages: {
              orderBy: [messages.createdAt],
            },
          },
        });

        if (!conversation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          });
        }

        return {
          id: conversation.id,
          title: conversation.title,
          createdAt: conversation.createdAt.toISOString(),
          updatedAt: conversation.updatedAt.toISOString(),
          lastMessageAt: conversation.lastMessageAt.toISOString(),
          messages: conversation.messages.map(message => ({
            id: message.id,
            role: message.role,
            content: message.content,
            tokens: message.tokens,
            modelId: message.modelId,
            createdAt: message.createdAt.toISOString(),
          })),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error fetching conversation:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch conversation',
        });
      }
    }),

  /**
   * Create a new conversation
   */
  createConversation: protectedProcedure
    .input(conversationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const [newConversation] = await db.insert(conversations)
          .values({
            id: uuidv4(),
            userId,
            title: input.title,
          })
          .returning();

        return {
          id: newConversation.id,
          title: newConversation.title,
          createdAt: newConversation.createdAt.toISOString(),
          updatedAt: newConversation.updatedAt.toISOString(),
          lastMessageAt: newConversation.lastMessageAt.toISOString(),
        };
      } catch (error) {
        console.error('Error creating conversation:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create conversation',
        });
      }
    }),

  /**
   * Update a conversation
   */
  updateConversation: protectedProcedure
    .input(conversationUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // Check if the conversation exists and belongs to the user
        const existingConversation = await db.query.conversations.findFirst({
          where: and(
            eq(conversations.id, input.id),
            eq(conversations.userId, userId)
          ),
        });

        if (!existingConversation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          });
        }

        // Update the conversation
        const [updatedConversation] = await db.update(conversations)
          .set({
            title: input.title,
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, input.id))
          .returning();

        return {
          id: updatedConversation.id,
          title: updatedConversation.title,
          createdAt: updatedConversation.createdAt.toISOString(),
          updatedAt: updatedConversation.updatedAt.toISOString(),
          lastMessageAt: updatedConversation.lastMessageAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error updating conversation:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update conversation',
        });
      }
    }),

  /**
   * Delete a conversation
   */
  deleteConversation: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // Check if the conversation exists and belongs to the user
        const existingConversation = await db.query.conversations.findFirst({
          where: and(
            eq(conversations.id, input.id),
            eq(conversations.userId, userId)
          ),
        });

        if (!existingConversation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          });
        }

        // Delete the conversation (messages will be cascade deleted)
        await db.delete(conversations)
          .where(eq(conversations.id, input.id));

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error deleting conversation:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete conversation',
        });
      }
    }),

  /**
   * Add a message to a conversation
   */
  addMessage: protectedProcedure
    .input(messageCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // Check if the conversation exists and belongs to the user
        const existingConversation = await db.query.conversations.findFirst({
          where: and(
            eq(conversations.id, input.conversationId),
            eq(conversations.userId, userId)
          ),
        });

        if (!existingConversation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          });
        }

        // Count tokens in the message
        const tokenCount = await countTokens(input.content);

        // Add the message
        const [newMessage] = await db.insert(messages)
          .values({
            id: uuidv4(),
            conversationId: input.conversationId,
            role: input.role,
            content: input.content,
            tokens: tokenCount,
            modelId: input.modelId || DEFAULT_MODEL_ID,
          })
          .returning();

        // Update the conversation's lastMessageAt
        await db.update(conversations)
          .set({
            updatedAt: new Date(),
            lastMessageAt: new Date(),
          })
          .where(eq(conversations.id, input.conversationId));

        return {
          id: newMessage.id,
          role: newMessage.role,
          content: newMessage.content,
          tokens: newMessage.tokens,
          modelId: newMessage.modelId,
          createdAt: newMessage.createdAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error adding message:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add message',
        });
      }
    }),
}); 