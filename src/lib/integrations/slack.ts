/**
 * Slack Integration
 * 
 * This file contains the implementation of the Slack integration.
 * It handles API calls and webhook handling using NextAuth for authentication.
 */

import { z } from 'zod';
import { auth, signIn, signOut } from '@/lib/auth';
import { Integration, ExtendedSession, AuthenticationError, isAuthenticatedWithProvider } from './oauth2-base';
import crypto from 'crypto';

/**
 * Slack API configuration
 */
const SLACK_API_URL = 'https://slack.com/api';

/**
 * Slack OAuth2 scopes
 */
const DEFAULT_SCOPES = [
  'chat:write',
  'channels:read',
  'users:read',
  'team:read',
  'chat:write.public',
  'incoming-webhook',
];

/**
 * Slack integration configuration schema
 */
export const slackConfigSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  signingSecret: z.string().optional(),
  teamId: z.string().optional(),
  teamName: z.string().optional(),
  botUserId: z.string().optional(),
  webhookUrl: z.string().optional(),
  scopes: z.array(z.string()).default(DEFAULT_SCOPES),
});

export type SlackConfig = z.infer<typeof slackConfigSchema>;

/**
 * Slack channel schema
 */
export const slackChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  is_channel: z.boolean(),
  is_group: z.boolean(),
  is_im: z.boolean(),
  is_private: z.boolean(),
  is_mpim: z.boolean(),
  created: z.number(),
  is_archived: z.boolean(),
  is_general: z.boolean(),
  unlinked: z.number(),
  name_normalized: z.string(),
  is_shared: z.boolean(),
  is_org_shared: z.boolean(),
  is_pending_ext_shared: z.boolean(),
  pending_shared: z.array(z.unknown()),
  context_team_id: z.string(),
  updated: z.number().optional(),
  parent_conversation: z.string().optional(),
  creator: z.string().optional(),
  is_ext_shared: z.boolean().optional(),
  shared_team_ids: z.array(z.string()).optional(),
  pending_connected_team_ids: z.array(z.string()).optional(),
  is_member: z.boolean().optional(),
  topic: z.object({
    value: z.string(),
    creator: z.string(),
    last_set: z.number(),
  }).optional(),
  purpose: z.object({
    value: z.string(),
    creator: z.string(),
    last_set: z.number(),
  }).optional(),
  previous_names: z.array(z.string()).optional(),
  num_members: z.number().optional(),
});

export type SlackChannel = z.infer<typeof slackChannelSchema>;

/**
 * Slack user schema
 */
export const slackUserSchema = z.object({
  id: z.string(),
  team_id: z.string(),
  name: z.string(),
  deleted: z.boolean(),
  color: z.string(),
  real_name: z.string(),
  tz: z.string(),
  tz_label: z.string(),
  tz_offset: z.number(),
  profile: z.object({
    title: z.string().optional(),
    phone: z.string().optional(),
    skype: z.string().optional(),
    real_name: z.string(),
    real_name_normalized: z.string(),
    display_name: z.string(),
    display_name_normalized: z.string(),
    status_text: z.string(),
    status_emoji: z.string(),
    status_expiration: z.number().optional(),
    avatar_hash: z.string(),
    email: z.string().optional(),
    image_original: z.string().optional(),
    image_24: z.string(),
    image_32: z.string(),
    image_48: z.string(),
    image_72: z.string(),
    image_192: z.string(),
    image_512: z.string(),
    team: z.string(),
  }),
  is_admin: z.boolean(),
  is_owner: z.boolean(),
  is_primary_owner: z.boolean(),
  is_restricted: z.boolean(),
  is_ultra_restricted: z.boolean(),
  is_bot: z.boolean(),
  is_app_user: z.boolean(),
  updated: z.number(),
  has_2fa: z.boolean().optional(),
});

export type SlackUser = z.infer<typeof slackUserSchema>;

/**
 * Slack message schema
 */
export const slackMessageSchema = z.object({
  channel: z.string(),
  text: z.string(),
  blocks: z.array(z.record(z.unknown())).optional(),
  thread_ts: z.string().optional(),
  reply_broadcast: z.boolean().optional(),
});

export type SlackMessage = z.infer<typeof slackMessageSchema>;

/**
 * Slack API response interface
 */
interface SlackApiResponse {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

/**
 * Slack channel response interface
 */
interface SlackChannelResponse extends SlackApiResponse {
  channels: Record<string, unknown>[];
}

/**
 * Slack user response interface
 */
interface SlackUserResponse extends SlackApiResponse {
  members: Record<string, unknown>[];
}

/**
 * Slack integration class
 */
export class SlackIntegration implements Integration {
  private config: SlackConfig;
  
  /**
   * Constructor for SlackIntegration
   * @param config - Configuration for the Slack integration
   */
  constructor(config: SlackConfig) {
    this.config = slackConfigSchema.parse(config);
  }
  
  /**
   * Get the integration ID
   * @returns The integration ID
   */
  getIntegrationId(): string {
    return 'slack';
  }
  
  /**
   * Get the team ID
   * @returns The team ID
   */
  getTeamId(): string {
    return this.config.teamId || '';
  }
  
  /**
   * Get the bot user ID
   * @returns The bot user ID
   */
  getBotUserId(): string {
    return this.config.botUserId || '';
  }
  
  /**
   * Get the authentication status for Slack
   * @returns Authentication status
   */
  async getAuthStatus(): Promise<{ isAuthenticated: boolean; accountId?: string }> {
    const session = await auth() as ExtendedSession;
    
    if (!session?.user) {
      return { isAuthenticated: false };
    }
    
    // Check if the user is authenticated with Slack
    if (isAuthenticatedWithProvider(session, 'slack')) {
      return { 
        isAuthenticated: true,
        accountId: session.user.id
      };
    }
    
    return { isAuthenticated: false };
  }
  
  /**
   * Disconnect from Slack
   * @returns True if disconnected successfully
   */
  async disconnect(): Promise<boolean> {
    try {
      await signOut({ redirect: false });
      return true;
    } catch (error) {
      console.error('Failed to disconnect from Slack:', error);
      return false;
    }
  }
  
  /**
   * Authenticate with Slack
   * @returns True if authentication was initiated
   */
  async authenticate(): Promise<boolean> {
    try {
      await signIn('slack', { redirect: true });
      return true;
    } catch (error) {
      console.error('Failed to authenticate with Slack:', error);
      return false;
    }
  }
  
  /**
   * Make a request to the Slack API
   * @param endpoint - The API endpoint
   * @param method - The HTTP method
   * @param data - The request data
   * @returns The API response
   */
  async makeRequest<T>(endpoint: string, method = 'GET', data?: Record<string, unknown>): Promise<T> {
    const session = await auth() as ExtendedSession;
    
    if (!isAuthenticatedWithProvider(session, 'slack')) {
      throw new AuthenticationError('Not authenticated with Slack');
    }
    
    const accessToken = session.token!.accessToken!;
    let url = `${SLACK_API_URL}/${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    };
    
    if (data) {
      if (method === 'GET') {
        const params = new URLSearchParams();
        Object.entries(data).forEach(([key, value]) => {
          params.append(key, String(value));
        });
        const queryString = params.toString();
        if (queryString) {
          const separator = url.includes('?') ? '&' : '?';
          url = url + separator + queryString;
        }
      } else {
        options.body = JSON.stringify(data);
      }
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || 'Unknown error'}`);
    }
    
    return result as T;
  }
  
  /**
   * Get channels from Slack
   * @returns List of channels
   */
  async getChannels(): Promise<SlackChannel[]> {
    const response = await this.makeRequest<SlackChannelResponse>('conversations.list', 'GET', {
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 1000,
    });
    
    return response.channels.map(channel => slackChannelSchema.parse(channel));
  }
  
  /**
   * Get users from Slack
   * @returns List of users
   */
  async getUsers(): Promise<SlackUser[]> {
    const response = await this.makeRequest<SlackUserResponse>('users.list', 'GET');
    
    return response.members.map(member => slackUserSchema.parse(member));
  }
  
  /**
   * Send a message to Slack
   * @param params - Message parameters
   * @returns The API response
   */
  async sendMessage(params: SlackMessage): Promise<Record<string, unknown>> {
    return await this.makeRequest('chat.postMessage', 'POST', params);
  }
  
  /**
   * Add a reaction to a message
   * @param channel - The channel ID
   * @param timestamp - The message timestamp
   * @param emoji - The emoji name
   * @returns The API response
   */
  async addReaction(channel: string, timestamp: string, emoji: string): Promise<Record<string, unknown>> {
    return await this.makeRequest('reactions.add', 'POST', {
      channel,
      timestamp,
      name: emoji,
    });
  }
  
  /**
   * Remove a reaction from a message
   * @param channel - The channel ID
   * @param timestamp - The message timestamp
   * @param emoji - The emoji name
   * @returns The API response
   */
  async removeReaction(channel: string, timestamp: string, emoji: string): Promise<Record<string, unknown>> {
    return await this.makeRequest('reactions.remove', 'POST', {
      channel,
      timestamp,
      name: emoji,
    });
  }
  
  /**
   * Get reactions for a message
   * @param channel - The channel ID
   * @param timestamp - The message timestamp
   * @returns The API response
   */
  async getReactions(channel: string, timestamp: string): Promise<Record<string, unknown>> {
    return await this.makeRequest('reactions.get', 'GET', {
      channel,
      timestamp,
    });
  }
  
  /**
   * Get thread replies
   * @param channel - The channel ID
   * @param thread_ts - The thread timestamp
   * @param limit - The maximum number of replies to return
   * @returns The API response
   */
  async getThreadReplies(channel: string, thread_ts: string, limit = 100): Promise<Record<string, unknown>> {
    return await this.makeRequest('conversations.replies', 'GET', {
      channel,
      ts: thread_ts,
      limit,
    });
  }
  
  /**
   * Get a user's presence
   * @param userId - The user ID
   * @returns The API response
   */
  async getUserPresence(userId: string): Promise<Record<string, unknown>> {
    return await this.makeRequest('users.getPresence', 'GET', {
      user: userId,
    });
  }
  
  /**
   * Set the user's presence
   * @param presence - The presence state
   * @returns The API response
   */
  async setUserPresence(presence: 'auto' | 'away'): Promise<Record<string, unknown>> {
    return await this.makeRequest('users.setPresence', 'POST', {
      presence,
    });
  }
  
  /**
   * Verify a request signature from Slack
   * @param signature - The X-Slack-Signature header
   * @param timestamp - The X-Slack-Request-Timestamp header
   * @param body - The request body
   * @returns True if the signature is valid
   */
  verifySignature(signature: string, timestamp: string, body: string): boolean {
    if (!this.config.signingSecret) {
      return false;
    }
    
    const hmac = crypto.createHmac('sha256', this.config.signingSecret);
    const [version, hash] = signature.split('=');
    
    // Check if the timestamp is too old (>5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - parseInt(timestamp, 10)) > 300) {
      return false;
    }
    
    const baseString = `${version}:${timestamp}:${body}`;
    const computedHash = hmac.update(baseString).digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(computedHash)
    );
  }
}

/**
 * Create a Slack integration
 * @param config - Configuration for the Slack integration
 * @returns A Slack integration instance
 */
export function createSlackIntegration(config: SlackConfig): SlackIntegration {
  return new SlackIntegration(config);
} 