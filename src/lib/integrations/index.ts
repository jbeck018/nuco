/**
 * Integration Factory
 * 
 * This file provides a factory for creating integration instances.
 * It serves as the central point for managing all integrations in the application.
 */

import { OAuth2Integration } from './oauth2-base';
import { SalesforceIntegration } from './salesforce';
import { HubSpotIntegration } from './hubspot';
import { createSlackIntegration } from './slack';

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
  static createIntegration(type: IntegrationType): OAuth2Integration {
    switch (type) {
      case 'salesforce':
        return new SalesforceIntegration();
      case 'hubspot':
        return new HubSpotIntegration();
      case 'google':
        // TODO: Implement Google integration
        throw new Error('Google integration not implemented yet');
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
        }) as unknown as OAuth2Integration;
      default:
        throw new Error(`Unknown integration type: ${type}`);
    }
  }

  /**
   * Get a list of available integration types
   * @returns An array of integration types
   */
  static getAvailableIntegrations(): IntegrationType[] {
    return ['salesforce', 'hubspot', 'google', 'slack'];
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
} 