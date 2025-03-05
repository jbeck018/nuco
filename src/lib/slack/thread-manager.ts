/**
 * Thread Manager for Slack Conversations
 * 
 * This module provides functionality to track and manage conversation threads in Slack.
 * It helps with organizing responses, tracking conversation context, and managing thread state.
 */

import { SlackIntegration } from '@/lib/integrations/slack';

// Define interfaces for thread management
interface ThreadMessage {
  ts: string;
  user: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface ThreadContext {
  threadId: string;
  channelId: string;
  parentMessageTs: string;
  messages: ThreadMessage[];
  lastActivity: Date;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

// Define interface for Slack message from API
interface SlackMessageResponse {
  ts: string;
  user?: string;
  text?: string;
  bot_id?: string;
  [key: string]: unknown;
}

/**
 * Thread Manager class for handling Slack conversation threads
 */
export class SlackThreadManager {
  private slack: SlackIntegration;
  private activeThreads: Map<string, ThreadContext> = new Map();
  
  constructor(slack: SlackIntegration) {
    this.slack = slack;
  }
  
  /**
   * Generate a unique thread ID from channel and timestamp
   */
  private generateThreadId(channelId: string, threadTs: string): string {
    return `${channelId}:${threadTs}`;
  }
  
  /**
   * Get or create a thread context
   */
  async getThreadContext(channelId: string, threadTs: string): Promise<ThreadContext> {
    const threadId = this.generateThreadId(channelId, threadTs);
    
    // Check if we have this thread in memory
    if (this.activeThreads.has(threadId)) {
      return this.activeThreads.get(threadId)!;
    }
    
    // Try to load from database
    // In a real implementation, you would store thread contexts in the database
    // For now, we'll just create a new one
    
    // Fetch thread history from Slack
    const threadHistory = await this.slack.getThreadReplies(channelId, threadTs);
    
    // Create thread context
    const context: ThreadContext = {
      threadId,
      channelId,
      parentMessageTs: threadTs,
      messages: [],
      lastActivity: new Date(),
      isActive: true,
      metadata: {}
    };
    
    // Process messages from thread history
    if (threadHistory.messages && Array.isArray(threadHistory.messages)) {
      context.messages = threadHistory.messages.map((msg: SlackMessageResponse) => ({
        ts: msg.ts,
        user: msg.user || 'unknown',
        text: msg.text || '',
        isBot: !!msg.bot_id,
        timestamp: new Date(parseFloat(msg.ts) * 1000)
      }));
    }
    
    // Store in memory
    this.activeThreads.set(threadId, context);
    
    return context;
  }
  
  /**
   * Add a message to a thread context
   */
  async addMessageToThread(
    channelId: string, 
    threadTs: string, 
    message: Omit<ThreadMessage, 'timestamp'>
  ): Promise<ThreadContext> {
    const context = await this.getThreadContext(channelId, threadTs);
    
    // Add the message to the context
    context.messages.push({
      ...message,
      timestamp: new Date()
    });
    
    // Update last activity
    context.lastActivity = new Date();
    
    // Update in memory
    this.activeThreads.set(context.threadId, context);
    
    return context;
  }
  
  /**
   * Get the conversation history for a thread
   */
  async getThreadHistory(channelId: string, threadTs: string): Promise<ThreadMessage[]> {
    const context = await this.getThreadContext(channelId, threadTs);
    return [...context.messages];
  }
  
  /**
   * Mark a thread as inactive
   */
  async closeThread(channelId: string, threadTs: string): Promise<void> {
    const threadId = this.generateThreadId(channelId, threadTs);
    
    if (this.activeThreads.has(threadId)) {
      const context = this.activeThreads.get(threadId)!;
      context.isActive = false;
      
      // In a real implementation, you would persist this to the database
      
      // Remove from memory after some time
      setTimeout(() => {
        this.activeThreads.delete(threadId);
      }, 30 * 60 * 1000); // 30 minutes
    }
  }
  
  /**
   * Get all active threads
   */
  getActiveThreads(): ThreadContext[] {
    return Array.from(this.activeThreads.values())
      .filter(thread => thread.isActive);
  }
  
  /**
   * Store metadata with a thread
   */
  async setThreadMetadata(
    channelId: string, 
    threadTs: string, 
    key: string, 
    value: unknown
  ): Promise<void> {
    const context = await this.getThreadContext(channelId, threadTs);
    
    if (!context.metadata) {
      context.metadata = {};
    }
    
    context.metadata[key] = value;
    
    // Update in memory
    this.activeThreads.set(context.threadId, context);
  }
  
  /**
   * Get metadata from a thread
   */
  async getThreadMetadata(
    channelId: string, 
    threadTs: string, 
    key: string
  ): Promise<unknown> {
    const context = await this.getThreadContext(channelId, threadTs);
    
    if (!context.metadata) {
      return undefined;
    }
    
    return context.metadata[key];
  }
}

/**
 * Create a thread manager instance
 */
export function createThreadManager(slack: SlackIntegration): SlackThreadManager {
  return new SlackThreadManager(slack);
} 