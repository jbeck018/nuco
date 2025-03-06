/**
 * HubSpot Integration
 * 
 * This file implements the HubSpot integration using the OAuth2Integration base class.
 * It provides methods for authenticating with HubSpot, revoking tokens, and fetching user information.
 * It also includes methods for working with HubSpot's CRM objects like contacts, companies, and deals.
 */

import { OAuth2Integration } from './oauth2-base';

/**
 * Interface for HubSpot user information
 */
export interface HubSpotUserInfo {
  hub_id: number;
  user_id: number;
  hub_domain: string;
  app_id: number;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  scopes: string[];
  hub_name: string;
  token_type: string;
  [key: string]: unknown;
}

/**
 * Interface for HubSpot contact properties
 */
export interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

/**
 * Interface for HubSpot company properties
 */
export interface HubSpotCompany {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    industry?: string;
    website?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

/**
 * Interface for HubSpot deal properties
 */
export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

/**
 * HubSpot Integration class
 */
export class HubSpotIntegration extends OAuth2Integration {
  private revokeTokenUrl: string;
  private userInfoUrl: string;
  private apiBaseUrl: string;

  /**
   * Constructor for HubSpotIntegration
   * @param config Optional configuration object
   */
  constructor(config?: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    scopes?: string[];
  }) {
    // Default configuration for HubSpot OAuth2
    super({
      clientId: config?.clientId || process.env.HUBSPOT_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.HUBSPOT_CLIENT_SECRET || '',
      redirectUri: config?.redirectUri || `${process.env.NEXTAUTH_URL}/api/integrations/hubspot/callback`,
      scopes: config?.scopes || [
        'oauth',
      ],
      authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
      tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    });

    // HubSpot-specific endpoints
    this.revokeTokenUrl = 'https://api.hubapi.com/oauth/v1/refresh-tokens/revoke';
    this.userInfoUrl = 'https://api.hubapi.com/oauth/v1/access-tokens/';
    this.apiBaseUrl = 'https://api.hubapi.com';
  }

  /**
   * Revoke a HubSpot refresh token
   * @param token The refresh token to revoke
   * @returns A boolean indicating success
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(this.revokeTokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }).toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Error revoking HubSpot token:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error revoking HubSpot token:', error);
      return false;
    }
  }

  /**
   * Get user information from HubSpot
   * @param accessToken The access token
   * @returns User information
   */
  async getUserInfo(accessToken: string): Promise<HubSpotUserInfo> {
    try {
      const response = await fetch(`${this.userInfoUrl}${accessToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get HubSpot user info: ${JSON.stringify(error)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting HubSpot user info:', error);
      throw error;
    }
  }

  /**
   * Get contacts from HubSpot
   * @param accessToken The access token
   * @param limit The number of contacts to return (default: 10)
   * @param after The pagination cursor
   * @returns A list of contacts
   */
  async getContacts(accessToken: string, limit: number = 10, after?: string): Promise<{ contacts: HubSpotContact[], after?: string }> {
    try {
      let url = `${this.apiBaseUrl}/crm/v3/objects/contacts?limit=${limit}`;
      if (after) {
        url += `&after=${after}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get HubSpot contacts: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      return {
        contacts: data.results,
        after: data.paging?.next?.after,
      };
    } catch (error) {
      console.error('Error getting HubSpot contacts:', error);
      throw error;
    }
  }

  /**
   * Get companies from HubSpot
   * @param accessToken The access token
   * @param limit The number of companies to return (default: 10)
   * @param after The pagination cursor
   * @returns A list of companies
   */
  async getCompanies(accessToken: string, limit: number = 10, after?: string): Promise<{ companies: HubSpotCompany[], after?: string }> {
    try {
      let url = `${this.apiBaseUrl}/crm/v3/objects/companies?limit=${limit}`;
      if (after) {
        url += `&after=${after}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get HubSpot companies: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      return {
        companies: data.results,
        after: data.paging?.next?.after,
      };
    } catch (error) {
      console.error('Error getting HubSpot companies:', error);
      throw error;
    }
  }

  /**
   * Get deals from HubSpot
   * @param accessToken The access token
   * @param limit The number of deals to return (default: 10)
   * @param after The pagination cursor
   * @returns A list of deals
   */
  async getDeals(accessToken: string, limit: number = 10, after?: string): Promise<{ deals: HubSpotDeal[], after?: string }> {
    try {
      let url = `${this.apiBaseUrl}/crm/v3/objects/deals?limit=${limit}`;
      if (after) {
        url += `&after=${after}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get HubSpot deals: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      return {
        deals: data.results,
        after: data.paging?.next?.after,
      };
    } catch (error) {
      console.error('Error getting HubSpot deals:', error);
      throw error;
    }
  }

  /**
   * Create a contact in HubSpot
   * @param accessToken The access token
   * @param properties The contact properties
   * @returns The created contact
   */
  async createContact(accessToken: string, properties: Record<string, string>): Promise<HubSpotContact> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/crm/v3/objects/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create HubSpot contact: ${JSON.stringify(error)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating HubSpot contact:', error);
      throw error;
    }
  }
} 