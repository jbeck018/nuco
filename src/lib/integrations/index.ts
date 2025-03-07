/**
 * Integration Factory
 * 
 * This file provides a factory for creating integration instances.
 * It serves as the central point for managing all integrations in the application.
 */

import { auth } from '@/lib/auth';
import { SalesforceIntegration } from './salesforce';
import { HubSpotIntegration } from './hubspot';
import { createSlackIntegration } from './slack';
import { ExtendedSession, isAuthenticatedWithProvider } from './oauth2-base';

/**
 * Available integration types
 */
export type IntegrationType = 'salesforce' | 'hubspot' | 'google' | 'slack';

/**
 * Interface for integration details
 */
export interface IntegrationDetails {
  name: string;
  description: string;
  icon: string;
  documentationUrl: string;
}

/**
 * Base interface for all integrations
 */
export interface Integration {
  getAuthStatus(): Promise<{ isAuthenticated: boolean; accountId?: string }>;
  disconnect(): Promise<boolean>;
}

/**
 * Integration Factory class
 * 
 * This class provides methods for creating and managing integrations.
 */
export class IntegrationFactory {
  /**
   * Create an integration instance based on the type
   * @param type The integration type
   * @returns An instance of the integration
   */
  static async createIntegration(type: IntegrationType): Promise<Integration> {
    switch (type) {
      case 'salesforce':
        return new SalesforceIntegration();
      case 'hubspot':
        return new HubSpotIntegration();
      case 'google':
        // Return a dummy integration for Google that's only used for login
        return {
          async getAuthStatus() {
            // Check if user is authenticated with Google via NextAuth
            const session = await auth() as ExtendedSession;
            return { 
              isAuthenticated: isAuthenticatedWithProvider(session, 'google'),
              accountId: session?.user?.id
            };
          },
          async disconnect() {
            return true;
          }
        };
      case 'slack':
        return createSlackIntegration({
          clientId: process.env.SLACK_CLIENT_ID || '',
          clientSecret: process.env.SLACK_CLIENT_SECRET || '',
          signingSecret: process.env.SLACK_SIGNING_SECRET,
          scopes: [
            'chat:write',
            'channels:read',
            'users:read',
            'team:read',
            'chat:write.public',
            'incoming-webhook',
          ],
        });
      default:
        throw new Error(`Unknown integration type: ${type}`);
    }
  }

  /**
   * Get a list of available integration types
   * @returns An array of integration types
   */
  static getAvailableIntegrations(): IntegrationType[] {
    // Exclude Google from dashboard integrations as it's only used for login
    return ['salesforce', 'hubspot', 'slack'];
  }

  /**
   * Get details for an integration type
   * @param type The integration type
   * @returns Details about the integration
   */
  static getIntegrationDetails(type: IntegrationType): IntegrationDetails {
    switch (type) {
      case 'salesforce':
        return {
          name: 'Salesforce',
          description: 'Connect to Salesforce to access your CRM data',
          icon: '/icons/salesforce.svg',
          documentationUrl: 'https://developer.salesforce.com/docs',
        };
      case 'hubspot':
        return {
          name: 'HubSpot',
          description: 'Connect to HubSpot to access your marketing, sales, and service data',
          icon: '/icons/hubspot.svg',
          documentationUrl: 'https://developers.hubspot.com/docs',
        };
      case 'google':
        return {
          name: 'Google',
          description: 'Connect to Google to access Gmail, Calendar, and Drive',
          icon: '/icons/google.svg',
          documentationUrl: 'https://developers.google.com/docs',
        };
      case 'slack':
        return {
          name: 'Slack',
          description: 'Connect to Slack to access your workspace data',
          icon: '/icons/slack.svg',
          documentationUrl: 'https://api.slack.com/docs',
        };
      default:
        throw new Error(`Unknown integration type: ${type}`);
    }
  }

  /**
   * Check if a user is authenticated with an integration
   * @param type The integration type
   * @returns Authentication status
   */
  static async getAuthStatus(type: IntegrationType): Promise<{ isAuthenticated: boolean; accountId?: string }> {
    const session = await auth() as ExtendedSession;
    
    if (!session?.user) {
      return { isAuthenticated: false };
    }

    // Check if the user is authenticated with the provider
    if (isAuthenticatedWithProvider(session, type)) {
      return { 
        isAuthenticated: true,
        accountId: session.user.id
      };
    }

    // For custom integrations, create the integration and check auth status
    try {
      const integration = await IntegrationFactory.createIntegration(type);
      return await integration.getAuthStatus();
    } catch (error) {
      console.error(`Error checking auth status for ${type}:`, error);
      return { isAuthenticated: false };
    }
  }
} 