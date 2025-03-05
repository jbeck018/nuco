/**
 * Slack Presence Tracker
 * 
 * This module provides functionality to track and manage user presence in Slack.
 * It helps with monitoring user activity, optimizing message timing, and providing
 * presence-aware features.
 */

import { SlackIntegration } from '@/lib/integrations/slack';

// Define interfaces for presence tracking
interface UserPresence {
  userId: string;
  userName: string;
  presence: 'active' | 'away' | 'unknown';
  lastUpdated: Date;
  lastActive?: Date;
  customStatus?: {
    text: string;
    emoji?: string;
    expiration?: number;
  };
  isOnline: boolean;
}

interface PresenceCache {
  [userId: string]: UserPresence;
}

/**
 * Presence Tracker class for handling Slack user presence
 */
export class SlackPresenceTracker {
  private slack: SlackIntegration;
  private presenceCache: PresenceCache = {};
  private updateInterval: NodeJS.Timeout | null = null;
  private updateIntervalMs: number;
  
  /**
   * Create a new presence tracker
   * @param slack - The Slack integration instance
   * @param updateIntervalMs - How often to update presence data (default: 5 minutes)
   */
  constructor(slack: SlackIntegration, updateIntervalMs = 5 * 60 * 1000) {
    this.slack = slack;
    this.updateIntervalMs = updateIntervalMs;
  }
  
  /**
   * Start tracking user presence
   */
  async startTracking(): Promise<void> {
    // Initial presence update
    await this.updateAllPresence();
    
    // Set up interval for regular updates
    this.updateInterval = setInterval(async () => {
      await this.updateAllPresence();
    }, this.updateIntervalMs);
  }
  
  /**
   * Stop tracking user presence
   */
  stopTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  /**
   * Update presence information for all users
   */
  async updateAllPresence(): Promise<void> {
    try {
      const response = await this.slack.getAllUsersPresence();
      
      if (response && Array.isArray(response.users)) {
        const now = new Date();
        
        response.users.forEach((userPresence: Record<string, unknown>) => {
          const userId = userPresence.user_id as string;
          const userName = userPresence.user_name as string;
          const presence = userPresence.presence as string;
          
          if (userId) {
            // Get existing presence data or create new entry
            const existingData = this.presenceCache[userId] || {
              userId,
              userName,
              presence: 'unknown',
              lastUpdated: now,
              isOnline: false
            };
            
            // Update presence data
            const isActive = presence === 'active';
            
            // If user just became active, update lastActive timestamp
            if (isActive && existingData.presence !== 'active') {
              existingData.lastActive = now;
            }
            
            // Update the cache
            this.presenceCache[userId] = {
              ...existingData,
              userName,
              presence: presence as 'active' | 'away' | 'unknown',
              lastUpdated: now,
              isOnline: isActive,
              customStatus: userPresence.status ? {
                text: userPresence.status_text as string,
                emoji: userPresence.status_emoji as string,
                expiration: userPresence.status_expiration as number
              } : existingData.customStatus
            };
          }
        });
      }
    } catch (error) {
      console.error('Error updating presence information:', error);
    }
  }
  
  /**
   * Get presence information for a specific user
   * @param userId - The ID of the user to get presence for
   * @returns The user's presence information, or null if not found
   */
  async getUserPresence(userId: string): Promise<UserPresence | null> {
    // Check if we have cached data
    const cachedData = this.presenceCache[userId];
    const now = new Date();
    
    // If data is recent (less than 5 minutes old), return it
    if (cachedData && (now.getTime() - cachedData.lastUpdated.getTime() < 5 * 60 * 1000)) {
      return cachedData;
    }
    
    // Otherwise, fetch fresh data
    try {
      const response = await this.slack.getUserPresence(userId);
      
      if (response) {
        const presence = response.presence as string;
        const isActive = presence === 'active';
        
        // Get existing presence data or create new entry
        const existingData = this.presenceCache[userId] || {
          userId,
          userName: '',
          presence: 'unknown',
          lastUpdated: now,
          isOnline: false
        };
        
        // If user just became active, update lastActive timestamp
        if (isActive && existingData.presence !== 'active') {
          existingData.lastActive = now;
        }
        
        // Update the cache
        this.presenceCache[userId] = {
          ...existingData,
          presence: presence as 'active' | 'away' | 'unknown',
          lastUpdated: now,
          isOnline: isActive
        };
        
        return this.presenceCache[userId];
      }
    } catch (error) {
      console.error(`Error getting presence for user ${userId}:`, error);
    }
    
    // Return cached data even if it's old, or null if we have nothing
    return cachedData || null;
  }
  
  /**
   * Get all active users
   * @returns An array of active users
   */
  getActiveUsers(): UserPresence[] {
    return Object.values(this.presenceCache).filter(user => user.presence === 'active');
  }
  
  /**
   * Get all users with their presence information
   * @returns An array of all tracked users
   */
  getAllUsers(): UserPresence[] {
    return Object.values(this.presenceCache);
  }
  
  /**
   * Check if a user is active
   * @param userId - The ID of the user to check
   * @returns Whether the user is active
   */
  isUserActive(userId: string): boolean {
    const user = this.presenceCache[userId];
    return user ? user.presence === 'active' : false;
  }
  
  /**
   * Get the time since a user was last active
   * @param userId - The ID of the user to check
   * @returns The time in milliseconds since the user was last active, or null if unknown
   */
  getTimeSinceLastActive(userId: string): number | null {
    const user = this.presenceCache[userId];
    
    if (user && user.lastActive) {
      return new Date().getTime() - user.lastActive.getTime();
    }
    
    return null;
  }
  
  /**
   * Check if it's a good time to send a notification to a user
   * This is a simple heuristic based on presence and recent activity
   * @param userId - The ID of the user to check
   * @returns Whether it's a good time to send a notification
   */
  isGoodTimeToNotify(userId: string): boolean {
    const user = this.presenceCache[userId];
    
    if (!user) {
      return true; // Default to true if we don't have data
    }
    
    // If user is active, it's a good time
    if (user.presence === 'active') {
      return true;
    }
    
    // If user has been away for less than 30 minutes, it might still be a good time
    const timeSinceLastActive = this.getTimeSinceLastActive(userId);
    if (timeSinceLastActive !== null && timeSinceLastActive < 30 * 60 * 1000) {
      return true;
    }
    
    // Otherwise, it's probably not a good time
    return false;
  }
}

/**
 * Create a presence tracker instance
 * @param slack - The Slack integration instance
 * @param updateIntervalMs - How often to update presence data (default: 5 minutes)
 */
export function createPresenceTracker(
  slack: SlackIntegration, 
  updateIntervalMs = 5 * 60 * 1000
): SlackPresenceTracker {
  return new SlackPresenceTracker(slack, updateIntervalMs);
} 