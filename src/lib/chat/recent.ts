import { cache } from 'react';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

/**
 * Get recent chats for a user
 * @param userId The user ID
 * @param limit The maximum number of chats to return
 * @returns Recent chats
 */
export const getRecentChats = cache(async (userId: string, limit: number = 5) => {
    if (!userId) {
        return [];
    }
  try {
    // Get recent conversations with their latest message
    const recentConversations = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        timestamp: conversations.lastMessageAt,
      })
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit);
    
    // For each conversation, get the latest user message to use as preview
    const results = await Promise.all(
      recentConversations.map(async (conversation) => {
        // Get the latest user message for preview
        const [latestUserMessage] = await db
          .select({
            content: messages.content,
          })
          .from(messages)
          .where(
            sql`${messages.conversationId} = ${conversation.id} AND ${messages.role} = 'user'`
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);
        
        // Truncate the preview if it's too long
        const preview = latestUserMessage?.content 
          ? latestUserMessage.content.substring(0, 60) + (latestUserMessage.content.length > 60 ? '...' : '')
          : 'No messages';
        
        return {
          id: conversation.id,
          title: conversation.title,
          timestamp: conversation.timestamp.toISOString(),
          preview,
        };
      })
    );
    
    return results;
  } catch (error) {
    console.error('Error fetching recent chats:', error);
    return [];
  }
}); 