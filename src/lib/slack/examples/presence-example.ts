/**
 * Presence Tracker Examples
 * 
 * This file contains examples of how to use the SlackPresenceTracker
 * to track and manage user presence in Slack.
 */

import { SlackIntegration } from '@/lib/integrations/slack';
import { createPresenceTracker } from '../presence-tracker';
import { createMessageBuilder } from '../message-builder';

/**
 * Example: Initialize and start the presence tracker
 */
export function initializePresenceTracker(slack: SlackIntegration) {
  // Create a presence tracker with a 10-minute update interval
  const presenceTracker = createPresenceTracker(slack, 10 * 60 * 1000);
  
  // Start tracking user presence
  presenceTracker.startTracking()
    .then(() => {
      console.log('Presence tracking started');
    })
    .catch(error => {
      console.error('Error starting presence tracking:', error);
    });
  
  return presenceTracker;
}

/**
 * Example: Send a message only if the user is active
 */
export async function sendMessageIfUserActive(
  slack: SlackIntegration,
  presenceTracker: ReturnType<typeof createPresenceTracker>,
  userId: string,
  channelId: string,
  message: string
): Promise<boolean> {
  // Check if the user is active
  const isActive = presenceTracker.isUserActive(userId);
  
  if (isActive) {
    // User is active, send the message
    await slack.sendMessage({
      channel: channelId,
      text: message,
    });
    
    return true;
  }
  
  // User is not active, don't send the message
  return false;
}

/**
 * Example: Send a notification with presence awareness
 */
export async function sendPresenceAwareNotification(
  slack: SlackIntegration,
  presenceTracker: ReturnType<typeof createPresenceTracker>,
  userId: string,
  channelId: string,
  message: string,
  urgency: 'low' | 'medium' | 'high' = 'medium'
): Promise<boolean> {
  // Check if it's a good time to notify the user
  const isGoodTime = presenceTracker.isGoodTimeToNotify(userId);
  
  // For high urgency, send regardless of presence
  if (urgency === 'high' || isGoodTime) {
    // Create a message with appropriate urgency indicator
    const messageBuilder = createMessageBuilder(message)
      .channel(channelId);
    
    if (urgency === 'high') {
      messageBuilder.addSection('🚨 *High Priority Notification*');
    } else if (urgency === 'medium') {
      messageBuilder.addSection('📢 *Notification*');
    } else {
      messageBuilder.addSection('📝 *FYI*');
    }
    
    messageBuilder.addSection(message);
    
    // Add context about when this was sent
    messageBuilder.addContext([
      `Sent at ${new Date().toLocaleTimeString()} • ` +
      `User status: ${isGoodTime ? 'Active' : 'Away'}`
    ]);
    
    // Send the message
    await slack.sendMessage({
      channel: channelId,
      text: message,
      blocks: messageBuilder.build().blocks,
    });
    
    return true;
  }
  
  // Not a good time and not high urgency, don't send
  return false;
}

/**
 * Example: Get active users and send a broadcast
 */
export async function sendBroadcastToActiveUsers(
  slack: SlackIntegration,
  presenceTracker: ReturnType<typeof createPresenceTracker>,
  channelId: string,
  message: string
): Promise<number> {
  // Get all active users
  const activeUsers = presenceTracker.getActiveUsers();
  
  if (activeUsers.length === 0) {
    return 0; // No active users
  }
  
  // Create a message mentioning all active users
  const mentions = activeUsers.map(user => `<@${user.userId}>`).join(' ');
  
  // Send the message
  await slack.sendMessage({
    channel: channelId,
    text: `${mentions}\n\n${message}`,
  });
  
  return activeUsers.length;
}

/**
 * Example: Create a presence dashboard message
 */
export async function sendPresenceDashboard(
  slack: SlackIntegration,
  presenceTracker: ReturnType<typeof createPresenceTracker>,
  channelId: string
): Promise<void> {
  // Get all users
  const allUsers = presenceTracker.getAllUsers();
  
  // Count active and away users
  const activeUsers = allUsers.filter(user => user.presence === 'active');
  const awayUsers = allUsers.filter(user => user.presence === 'away');
  
  // Create a message with presence information
  const messageBuilder = createMessageBuilder('Team Presence Dashboard')
    .channel(channelId)
    .addHeader('Team Presence Dashboard')
    .addSection(`*Active Users:* ${activeUsers.length}/${allUsers.length}`)
    .addDivider();
  
  // Add active users section
  if (activeUsers.length > 0) {
    messageBuilder.addSection('*🟢 Active Users*');
    
    const activeFields = activeUsers.map(user => 
      `*${user.userName}*\nActive since: ${user.lastActive ? new Date(user.lastActive).toLocaleTimeString() : 'Unknown'}`
    );
    
    // Add fields in groups of 10 to avoid exceeding Slack's limits
    for (let i = 0; i < activeFields.length; i += 10) {
      messageBuilder.addFields(activeFields.slice(i, i + 10));
    }
  }
  
  // Add away users section
  if (awayUsers.length > 0) {
    messageBuilder.addSection('*🔴 Away Users*');
    
    const awayFields = awayUsers.map(user => {
      const timeSinceActive = presenceTracker.getTimeSinceLastActive(user.userId);
      const timeString = timeSinceActive 
        ? `${Math.floor(timeSinceActive / (60 * 1000))} minutes ago` 
        : 'Unknown';
      
      return `*${user.userName}*\nLast active: ${timeString}`;
    });
    
    // Add fields in groups of 10 to avoid exceeding Slack's limits
    for (let i = 0; i < awayFields.length; i += 10) {
      messageBuilder.addFields(awayFields.slice(i, i + 10));
    }
  }
  
  // Add timestamp
  messageBuilder.addDivider();
  messageBuilder.addContext([
    `Last updated: ${new Date().toLocaleString()}`
  ]);
  
  // Send the message
  await slack.sendMessage({
    channel: channelId,
    text: 'Team Presence Dashboard',
    blocks: messageBuilder.build().blocks,
  });
} 