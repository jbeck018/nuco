/**
 * Slack Analytics Service
 * 
 * This module provides functionality for tracking and analyzing Slack integration usage.
 * It helps with collecting metrics, generating reports, and providing insights.
 */

import { db } from '@/lib/db';
import { 
  slackEvents, 
  slackEventTypes, 
  slackUserActivity, 
  slackChannelActivity, 
  slackAIPerformance 
} from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

/**
 * Event data interface for tracking Slack events
 */
interface SlackEventData {
  eventType: string;
  integrationId: string;
  userId?: string;
  organizationId?: string;
  slackUserId?: string;
  slackChannelId?: string;
  slackTeamId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * AI performance data interface for tracking AI responses
 */
interface SlackAIPerformanceData {
  integrationId: string;
  messageId: string;
  slackUserId?: string;
  slackChannelId?: string;
  promptLength?: number;
  responseLength?: number;
  responseTime?: number;
  modelUsed?: string;
  feedbackRating?: number;
  feedbackComment?: string;
}

/**
 * Time period options for analytics queries
 */
type TimePeriod = 'day' | 'week' | 'month' | 'year' | 'all';

/**
 * Type for event type record
 */
interface EventTypeRecord {
  id: string;
  name: string;
  description: string | null;
  category: string;
  createdAt: Date;
}

/**
 * Analytics service class for Slack integration
 */
export class SlackAnalyticsService {
  /**
   * Track a Slack event
   * @param eventData - Data about the event to track
   */
  async trackEvent(eventData: SlackEventData): Promise<void> {
    try {
      // Get or create event type
      let eventType = await db.query.slackEventTypes.findFirst({
        where: eq(slackEventTypes.name, eventData.eventType),
      });
      
      if (!eventType) {
        // Create new event type if it doesn't exist
        const [newEventType] = await db.insert(slackEventTypes).values({
          name: eventData.eventType,
          description: `Events of type ${eventData.eventType}`,
          category: this.getCategoryFromEventType(eventData.eventType),
        }).returning();
        
        eventType = newEventType;
      }
      
      // Record the event
      await db.insert(slackEvents).values({
        eventTypeId: eventType.id,
        integrationId: eventData.integrationId,
        userId: eventData.userId,
        organizationId: eventData.organizationId,
        slackUserId: eventData.slackUserId,
        slackChannelId: eventData.slackChannelId,
        slackTeamId: eventData.slackTeamId,
        metadata: eventData.metadata,
      });
      
      // Update user activity if applicable
      if (eventData.slackUserId) {
        await this.updateUserActivity(
          eventData.integrationId,
          eventData.slackUserId,
          eventData.eventType
        );
      }
      
      // Update channel activity if applicable
      if (eventData.slackChannelId) {
        await this.updateChannelActivity(
          eventData.integrationId,
          eventData.slackChannelId,
          eventData.eventType,
          eventData.slackUserId
        );
      }
    } catch (error) {
      console.error('Error tracking Slack event:', error);
    }
  }
  
  /**
   * Track AI performance metrics
   * @param performanceData - Data about the AI performance to track
   */
  async trackAIPerformance(performanceData: SlackAIPerformanceData): Promise<void> {
    try {
      await db.insert(slackAIPerformance).values(performanceData);
    } catch (error) {
      console.error('Error tracking AI performance:', error);
    }
  }
  
  /**
   * Update user activity metrics
   */
  private async updateUserActivity(
    integrationId: string,
    slackUserId: string,
    eventType: string
  ): Promise<void> {
    try {
      // Get existing user activity record or create new one
      const existingActivity = await db.query.slackUserActivity.findFirst({
        where: and(
          eq(slackUserActivity.integrationId, integrationId),
          eq(slackUserActivity.slackUserId, slackUserId)
        ),
      });
      
      if (existingActivity) {
        // Update existing record
        const updates: Partial<typeof existingActivity> = {
          lastActive: new Date(),
          totalInteractions: existingActivity.totalInteractions + 1,
          updatedAt: new Date(),
        };
        
        // Update specific counters based on event type
        if (eventType.startsWith('command_')) {
          updates.commandsUsed = existingActivity.commandsUsed + 1;
        } else if (eventType === 'message_received') {
          updates.messagesReceived = existingActivity.messagesReceived + 1;
        } else if (eventType === 'message_sent') {
          updates.messagesSent = existingActivity.messagesSent + 1;
        } else if (eventType === 'reaction_received') {
          updates.reactionsReceived = existingActivity.reactionsReceived + 1;
        }
        
        await db.update(slackUserActivity)
          .set(updates)
          .where(eq(slackUserActivity.id, existingActivity.id));
      } else {
        // Create new record with required fields
        await db.insert(slackUserActivity).values({
          integrationId,
          slackUserId,
          lastActive: new Date(),
          totalInteractions: 1,
          commandsUsed: eventType.startsWith('command_') ? 1 : 0,
          messagesReceived: eventType === 'message_received' ? 1 : 0,
          messagesSent: eventType === 'message_sent' ? 1 : 0,
          reactionsReceived: eventType === 'reaction_received' ? 1 : 0,
        });
      }
    } catch (error) {
      console.error('Error updating user activity:', error);
    }
  }
  
  /**
   * Update channel activity metrics
   */
  private async updateChannelActivity(
    integrationId: string,
    slackChannelId: string,
    eventType: string,
    slackUserId?: string
  ): Promise<void> {
    try {
      // Get existing channel activity record or create new one
      const existingActivity = await db.query.slackChannelActivity.findFirst({
        where: and(
          eq(slackChannelActivity.integrationId, integrationId),
          eq(slackChannelActivity.slackChannelId, slackChannelId)
        ),
      });
      
      if (existingActivity) {
        // Update existing record
        const updates: Partial<typeof existingActivity> = {
          totalInteractions: existingActivity.totalInteractions + 1,
          updatedAt: new Date(),
        };
        
        // Update specific counters based on event type
        if (eventType.startsWith('command_')) {
          updates.commandsUsed = existingActivity.commandsUsed + 1;
        } else if (eventType === 'message_received') {
          updates.messagesReceived = existingActivity.messagesReceived + 1;
        } else if (eventType === 'message_sent') {
          updates.messagesSent = existingActivity.messagesSent + 1;
        }
        
        // If we have a user ID and it's a new user, increment unique users
        if (slackUserId) {
          // Check if this user has been active in this channel before
          const userEvents = await db.query.slackEvents.findFirst({
            where: and(
              eq(slackEvents.integrationId, integrationId),
              eq(slackEvents.slackChannelId, slackChannelId),
              eq(slackEvents.slackUserId, slackUserId),
              sql`${slackEvents.timestamp} < NOW()`
            ),
          });
          
          if (!userEvents) {
            updates.uniqueUsers = existingActivity.uniqueUsers + 1;
          }
        }
        
        await db.update(slackChannelActivity)
          .set(updates)
          .where(eq(slackChannelActivity.id, existingActivity.id));
      } else {
        // Create new record with required fields
        await db.insert(slackChannelActivity).values({
          integrationId,
          slackChannelId,
          totalInteractions: 1,
          commandsUsed: eventType.startsWith('command_') ? 1 : 0,
          messagesReceived: eventType === 'message_received' ? 1 : 0,
          messagesSent: eventType === 'message_sent' ? 1 : 0,
          uniqueUsers: slackUserId ? 1 : 0,
        });
      }
    } catch (error) {
      console.error('Error updating channel activity:', error);
    }
  }
  
  /**
   * Get category from event type
   */
  private getCategoryFromEventType(eventType: string): string {
    if (eventType.startsWith('command_')) {
      return 'command';
    } else if (eventType.startsWith('message_')) {
      return 'message';
    } else if (eventType.startsWith('reaction_')) {
      return 'reaction';
    } else if (eventType.startsWith('template_')) {
      return 'template';
    } else if (eventType.startsWith('ai_')) {
      return 'ai';
    } else {
      return 'other';
    }
  }
  
  /**
   * Get date range for a time period
   */
  private getDateRangeForPeriod(period: TimePeriod): { startDate: Date, endDate: Date } {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
    }
    
    return { startDate, endDate };
  }
  
  /**
   * Get event counts by type for a specific integration
   */
  async getEventCountsByType(
    integrationId: string,
    period: TimePeriod = 'month'
  ): Promise<Record<string, number>> {
    try {
      const { startDate, endDate } = this.getDateRangeForPeriod(period);
      
      // Get all event types
      const eventTypes = await db.query.slackEventTypes.findMany();
      
      // Create a map of event type IDs to names
      const eventTypeMap = new Map<string, string>();
      eventTypes.forEach((type: EventTypeRecord) => {
        eventTypeMap.set(type.id, type.name);
      });
      
      // Get event counts
      const eventCounts = await db.select({
        eventTypeId: slackEvents.eventTypeId,
        count: sql<number>`count(*)`,
      })
      .from(slackEvents)
      .where(and(
        eq(slackEvents.integrationId, integrationId),
        gte(slackEvents.timestamp, startDate),
        lte(slackEvents.timestamp, endDate)
      ))
      .groupBy(slackEvents.eventTypeId);
      
      // Convert to a record with event type names as keys
      const result: Record<string, number> = {};
      eventCounts.forEach(count => {
        const eventTypeName = eventTypeMap.get(count.eventTypeId) || 'unknown';
        result[eventTypeName] = count.count;
      });
      
      return result;
    } catch (error) {
      console.error('Error getting event counts by type:', error);
      return {};
    }
  }
  
  /**
   * Get top active users for a specific integration
   */
  async getTopActiveUsers(
    integrationId: string,
    limit: number = 10
  ): Promise<typeof slackUserActivity.$inferSelect[]> {
    try {
      return await db.query.slackUserActivity.findMany({
        where: eq(slackUserActivity.integrationId, integrationId),
        orderBy: [desc(slackUserActivity.totalInteractions)],
        limit,
      });
    } catch (error) {
      console.error('Error getting top active users:', error);
      return [];
    }
  }
  
  /**
   * Get top active channels for a specific integration
   */
  async getTopActiveChannels(
    integrationId: string,
    limit: number = 10
  ): Promise<typeof slackChannelActivity.$inferSelect[]> {
    try {
      return await db.query.slackChannelActivity.findMany({
        where: eq(slackChannelActivity.integrationId, integrationId),
        orderBy: [desc(slackChannelActivity.totalInteractions)],
        limit,
      });
    } catch (error) {
      console.error('Error getting top active channels:', error);
      return [];
    }
  }
  
  /**
   * Get AI performance metrics for a specific integration
   */
  async getAIPerformanceMetrics(
    integrationId: string,
    period: TimePeriod = 'month'
  ): Promise<{
    averageResponseTime: number;
    averageFeedbackRating: number;
    totalResponses: number;
  }> {
    try {
      const { startDate, endDate } = this.getDateRangeForPeriod(period);
      
      const metrics = await db.select({
        avgResponseTime: sql<number>`avg(${slackAIPerformance.responseTime})`,
        avgFeedbackRating: sql<number>`avg(${slackAIPerformance.feedbackRating})`,
        totalResponses: sql<number>`count(*)`,
      })
      .from(slackAIPerformance)
      .where(and(
        eq(slackAIPerformance.integrationId, integrationId),
        gte(slackAIPerformance.createdAt, startDate),
        lte(slackAIPerformance.createdAt, endDate)
      ));
      
      if (metrics.length === 0) {
        return {
          averageResponseTime: 0,
          averageFeedbackRating: 0,
          totalResponses: 0,
        };
      }
      
      return {
        averageResponseTime: metrics[0].avgResponseTime || 0,
        averageFeedbackRating: metrics[0].avgFeedbackRating || 0,
        totalResponses: metrics[0].totalResponses || 0,
      };
    } catch (error) {
      console.error('Error getting AI performance metrics:', error);
      return {
        averageResponseTime: 0,
        averageFeedbackRating: 0,
        totalResponses: 0,
      };
    }
  }
  
  /**
   * Get usage summary for a specific integration
   */
  async getUsageSummary(
    integrationId: string,
    period: TimePeriod = 'month'
  ): Promise<{
    totalEvents: number;
    totalUsers: number;
    totalChannels: number;
    commandsUsed: number;
    messagesProcessed: number;
    aiResponses: number;
  }> {
    try {
      const { startDate, endDate } = this.getDateRangeForPeriod(period);
      
      // Get total events
      const eventsResult = await db.select({
        count: sql<number>`count(*)`,
      })
      .from(slackEvents)
      .where(and(
        eq(slackEvents.integrationId, integrationId),
        gte(slackEvents.timestamp, startDate),
        lte(slackEvents.timestamp, endDate)
      ));
      
      // Get unique users
      const usersResult = await db.select({
        count: sql<number>`count(distinct ${slackEvents.slackUserId})`,
      })
      .from(slackEvents)
      .where(and(
        eq(slackEvents.integrationId, integrationId),
        gte(slackEvents.timestamp, startDate),
        lte(slackEvents.timestamp, endDate),
        sql`${slackEvents.slackUserId} is not null`
      ));
      
      // Get unique channels
      const channelsResult = await db.select({
        count: sql<number>`count(distinct ${slackEvents.slackChannelId})`,
      })
      .from(slackEvents)
      .where(and(
        eq(slackEvents.integrationId, integrationId),
        gte(slackEvents.timestamp, startDate),
        lte(slackEvents.timestamp, endDate),
        sql`${slackEvents.slackChannelId} is not null`
      ));
      
      // Get event counts by category
      const eventTypes = await db.query.slackEventTypes.findMany();
      const commandEventTypeIds = eventTypes
        .filter((type: EventTypeRecord) => type.category === 'command')
        .map((type: EventTypeRecord) => type.id);
      
      const messageEventTypeIds = eventTypes
        .filter((type: EventTypeRecord) => type.category === 'message')
        .map((type: EventTypeRecord) => type.id);
      
      const aiEventTypeIds = eventTypes
        .filter((type: EventTypeRecord) => type.category === 'ai')
        .map((type: EventTypeRecord) => type.id);
      
      // Get command counts
      const commandsResult = await db.select({
        count: sql<number>`count(*)`,
      })
      .from(slackEvents)
      .where(and(
        eq(slackEvents.integrationId, integrationId),
        gte(slackEvents.timestamp, startDate),
        lte(slackEvents.timestamp, endDate),
        commandEventTypeIds.length > 0 
          ? sql`${slackEvents.eventTypeId} in ${commandEventTypeIds}` 
          : sql`1=0`
      ));
      
      // Get message counts
      const messagesResult = await db.select({
        count: sql<number>`count(*)`,
      })
      .from(slackEvents)
      .where(and(
        eq(slackEvents.integrationId, integrationId),
        gte(slackEvents.timestamp, startDate),
        lte(slackEvents.timestamp, endDate),
        messageEventTypeIds.length > 0 
          ? sql`${slackEvents.eventTypeId} in ${messageEventTypeIds}` 
          : sql`1=0`
      ));
      
      // Get AI response counts
      const aiResult = await db.select({
        count: sql<number>`count(*)`,
      })
      .from(slackEvents)
      .where(and(
        eq(slackEvents.integrationId, integrationId),
        gte(slackEvents.timestamp, startDate),
        lte(slackEvents.timestamp, endDate),
        aiEventTypeIds.length > 0 
          ? sql`${slackEvents.eventTypeId} in ${aiEventTypeIds}` 
          : sql`1=0`
      ));
      
      return {
        totalEvents: eventsResult[0]?.count || 0,
        totalUsers: usersResult[0]?.count || 0,
        totalChannels: channelsResult[0]?.count || 0,
        commandsUsed: commandsResult[0]?.count || 0,
        messagesProcessed: messagesResult[0]?.count || 0,
        aiResponses: aiResult[0]?.count || 0,
      };
    } catch (error) {
      console.error('Error getting usage summary:', error);
      return {
        totalEvents: 0,
        totalUsers: 0,
        totalChannels: 0,
        commandsUsed: 0,
        messagesProcessed: 0,
        aiResponses: 0,
      };
    }
  }
}

/**
 * Create a Slack analytics service instance
 */
export function createSlackAnalyticsService(): SlackAnalyticsService {
  return new SlackAnalyticsService();
} 