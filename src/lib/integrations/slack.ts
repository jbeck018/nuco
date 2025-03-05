/**
 * Slack Integration
 * 
 * This file contains the implementation of the Slack integration.
 * It handles OAuth2 authentication, API calls, and webhook handling.
 */

import { z } from 'zod';
import { OAuth2Integration, OAuth2IntegrationConfig, OAuth2Tokens } from './oauth2-base';
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
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.number().optional(),
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
  is_private: z.boolean(),
  is_archived: z.boolean().optional(),
  num_members: z.number().optional(),
});

export type SlackChannel = z.infer<typeof slackChannelSchema>;

/**
 * Slack user schema
 */
export const slackUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  real_name: z.string().optional(),
  profile: z.object({
    display_name: z.string().optional(),
    email: z.string().optional(),
    image_72: z.string().optional(),
  }).optional(),
  is_bot: z.boolean().optional(),
  is_admin: z.boolean().optional(),
});

export type SlackUser = z.infer<typeof slackUserSchema>;

/**
 * Slack message schema
 */
export const slackMessageSchema = z.object({
  channel: z.string(),
  text: z.string().optional(),
  blocks: z.array(z.any()).optional(),
  thread_ts: z.string().optional(),
  mrkdwn: z.boolean().optional(),
});

export type SlackMessage = z.infer<typeof slackMessageSchema>;

/**
 * Slack API response type
 */
interface SlackApiResponse {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

/**
 * Slack channel response
 */
interface SlackChannelResponse extends SlackApiResponse {
  channels: Record<string, unknown>[];
}

/**
 * Slack user response
 */
interface SlackUserResponse extends SlackApiResponse {
  members: Record<string, unknown>[];
}

/**
 * Slack integration class
 */
export class SlackIntegration extends OAuth2Integration {
  private config: SlackConfig;

  constructor(config: SlackConfig) {
    const oauthConfig: OAuth2IntegrationConfig = {
      authorizationUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: '',
      scopes: config.scopes,
    };

    super(oauthConfig);
    this.config = config;
  }

  /**
   * Get the integration ID (used for analytics)
   * This is a placeholder - in a real implementation, this would be set when the integration is created
   */
  getIntegrationId(): string {
    // In a real implementation, this would be the ID from the database
    // For now, we'll use the team ID as a fallback
    return this.config.teamId || 'unknown';
  }

  /**
   * Get the team ID
   */
  getTeamId(): string {
    return this.config.teamId || 'unknown';
  }

  /**
   * Get the bot user ID
   */
  getBotUserId(): string {
    return this.config.botUserId || 'unknown';
  }

  /**
   * Get the authorization URL for OAuth2 flow with custom redirect URI
   */
  getSlackAuthorizationUrl(redirectUri: string, state: string): string {
    this.redirectUri = redirectUri;
    const url = new URL(this.authorizationUrl);
    url.searchParams.append('client_id', this.clientId);
    url.searchParams.append('scope', this.scopes.join(' '));
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('state', state);
    url.searchParams.append('user_scope', '');
    
    return url.toString();
  }

  /**
   * Override the base getAuthorizationUrl to satisfy the interface
   */
  getAuthorizationUrl(state: string): string {
    // For Slack, we need a redirect URI, so we'll use a default one if available
    if (process.env.NEXT_PUBLIC_APP_URL) {
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`;
      return this.getSlackAuthorizationUrl(redirectUri, state);
    }
    
    // If no default redirect URI is available, throw an error
    throw new Error('Use getSlackAuthorizationUrl with redirectUri for Slack');
  }

  /**
   * Handle the OAuth2 callback and exchange code for tokens
   */
  async handleCallback(code: string, redirectUri: string): Promise<SlackConfig> {
    this.redirectUri = redirectUri;
    
    const tokenResponse = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to exchange code for token: ${await tokenResponse.text()}`);
    }

    const data = await tokenResponse.json();

    // Update the config with the new tokens
    this.config = {
      ...this.config,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
      teamId: data.team?.id,
      teamName: data.team?.name,
      botUserId: data.bot_user_id,
      webhookUrl: data.incoming_webhook?.url,
    };

    return this.config;
  }

  /**
   * Make an authenticated request to the Slack API
   */
  async makeRequest<T>(endpoint: string, method = 'GET', data?: Record<string, unknown>): Promise<T> {
    const tokens = await this.getAccessToken();
    
    let url = `${SLACK_API_URL}/${endpoint}`;
    const headers: HeadersInit = {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json; charset=utf-8',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data) {
      if (method === 'GET') {
        const params = new URLSearchParams();
        Object.entries(data).forEach(([key, value]) => {
          params.append(key, String(value));
        });
        const queryString = params.toString();
        if (queryString) {
          url = url.includes('?') 
            ? url + '&' + queryString 
            : url + '?' + queryString;
        }
      } else {
        options.body = JSON.stringify(data);
      }
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`Slack API error: ${await response.text()}`);
    }

    const responseData = await response.json() as SlackApiResponse;
    
    if (!responseData.ok) {
      throw new Error(`Slack API error: ${responseData.error}`);
    }

    return responseData as unknown as T;
  }

  /**
   * Get a list of channels
   */
  async getChannels(): Promise<SlackChannel[]> {
    const response = await this.makeRequest<SlackChannelResponse>('conversations.list', 'GET', {
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 1000,
    });

    return response.channels.map(channel => ({
      id: channel.id as string,
      name: channel.name as string,
      is_private: channel.is_private as boolean,
      is_archived: channel.is_archived as boolean | undefined,
      num_members: channel.num_members as number | undefined,
    }));
  }

  /**
   * Get a list of users
   */
  async getUsers(): Promise<SlackUser[]> {
    const response = await this.makeRequest<SlackUserResponse>('users.list', 'GET');

    return response.members.map(user => ({
      id: user.id as string,
      name: user.name as string,
      real_name: user.real_name as string | undefined,
      profile: user.profile as SlackUser['profile'],
      is_bot: user.is_bot as boolean | undefined,
      is_admin: user.is_admin as boolean | undefined,
    }));
  }

  /**
   * Send a message to a Slack channel
   * @param params - Message parameters
   * @returns The API response
   */
  async sendMessage(params: {
    channel: string;
    text: string;
    blocks?: Record<string, unknown>[];
    thread_ts?: string;
    reply_broadcast?: boolean;
  }): Promise<Record<string, unknown>> {
    return this.makeRequest('chat.postMessage', 'POST', params);
  }

  /**
   * Add a reaction to a message
   * @param channel - The channel ID containing the message
   * @param timestamp - The timestamp of the message
   * @param emoji - The emoji name (without colons)
   * @returns The API response
   */
  async addReaction(channel: string, timestamp: string, emoji: string): Promise<Record<string, unknown>> {
    return this.makeRequest('reactions.add', 'POST', {
      channel,
      timestamp,
      name: emoji,
    });
  }

  /**
   * Remove a reaction from a message
   * @param channel - The channel ID containing the message
   * @param timestamp - The timestamp of the message
   * @param emoji - The emoji name (without colons)
   * @returns The API response
   */
  async removeReaction(channel: string, timestamp: string, emoji: string): Promise<Record<string, unknown>> {
    return this.makeRequest('reactions.remove', 'POST', {
      channel,
      timestamp,
      name: emoji,
    });
  }

  /**
   * Get reactions for a message
   * @param channel - The channel ID containing the message
   * @param timestamp - The timestamp of the message
   * @returns The API response with reactions
   */
  async getReactions(channel: string, timestamp: string): Promise<Record<string, unknown>> {
    return this.makeRequest('reactions.get', 'GET', {
      channel,
      timestamp,
    });
  }

  /**
   * Get replies in a thread
   * @param channel - The channel ID containing the thread
   * @param thread_ts - The timestamp of the parent message
   * @param limit - Maximum number of replies to return (default: 100)
   * @returns The API response with thread replies
   */
  async getThreadReplies(channel: string, thread_ts: string, limit: number = 100): Promise<Record<string, unknown>> {
    return this.makeRequest('conversations.replies', 'GET', {
      channel,
      ts: thread_ts,
      limit,
    });
  }

  /**
   * Get a user's presence information
   * @param userId - The ID of the user to get presence for
   * @returns The API response with presence information
   */
  async getUserPresence(userId: string): Promise<Record<string, unknown>> {
    return this.makeRequest('users.getPresence', 'GET', {
      user: userId,
    });
  }

  /**
   * Set the user's presence
   * @param presence - The presence state to set ('auto' or 'away')
   * @returns The API response
   */
  async setUserPresence(presence: 'auto' | 'away'): Promise<Record<string, unknown>> {
    return this.makeRequest('users.setPresence', 'POST', {
      presence,
    });
  }

  /**
   * Get the online status of all users in a workspace
   * @returns The API response with all users' presence information
   */
  async getAllUsersPresence(): Promise<Record<string, unknown>> {
    // Slack doesn't have a direct API for this, so we'll get all users and their presence
    const users = await this.getUsers();
    
    // Get presence for each user
    const presencePromises = users.map(user => 
      this.getUserPresence(user.id)
        .then(presence => ({
          user_id: user.id,
          user_name: user.name,
          ...presence
        }))
        .catch(() => ({
          user_id: user.id,
          user_name: user.name,
          presence: 'unknown',
          error: true
        }))
    );
    
    const presenceResults = await Promise.all(presencePromises);
    
    return {
      ok: true,
      users: presenceResults
    };
  }

  /**
   * Verify a request signature from Slack
   * @param signature - The X-Slack-Signature header
   * @param timestamp - The X-Slack-Request-Timestamp header
   * @param body - The raw request body
   * @returns Whether the signature is valid
   */
  verifySignature(signature: string, timestamp: string, body: string): boolean {
    if (!this.config.signingSecret) {
      throw new Error('Signing secret is not configured');
    }

    const hmac = crypto.createHmac('sha256', this.config.signingSecret);
    const [version, hash] = signature.split('=');
    
    hmac.update(`${version}:${timestamp}:${body}`);
    const calculatedHash = hmac.digest('hex');
    
    return hash === calculatedHash;
  }

  /**
   * Revoke the access token
   */
  async revokeToken(token: string): Promise<boolean> {
    const response = await fetch('https://slack.com/api/auth.revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json() as SlackApiResponse;
    return data.ok;
  }

  /**
   * Get user info
   */
  async getUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    const response = await fetch('https://slack.com/api/users.identity', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${await response.text()}`);
    }

    const data = await response.json() as SlackApiResponse;
    
    if (!data.ok) {
      throw new Error(`Failed to get user info: ${data.error}`);
    }

    return data;
  }

  /**
   * Get access token
   */
  private async getAccessToken(): Promise<OAuth2Tokens> {
    // If we have a valid access token, return it
    if (this.config.accessToken && this.config.expiresAt && this.config.expiresAt > Date.now()) {
      return {
        access_token: this.config.accessToken,
        token_type: 'Bearer',
        refresh_token: this.config.refreshToken,
      };
    }

    // If we have a refresh token, use it to get a new access token
    if (this.config.refreshToken) {
      const tokens = await this.refreshAccessToken(this.config.refreshToken);
      
      // Update the config with the new tokens
      this.config = {
        ...this.config,
        accessToken: tokens.access_token,
        expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
      };

      return tokens;
    }

    throw new Error('No valid access token or refresh token available');
  }
}

/**
 * Create a new Slack integration instance
 */
export function createSlackIntegration(config: SlackConfig): SlackIntegration {
  return new SlackIntegration(config);
} 