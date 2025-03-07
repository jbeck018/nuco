/**
 * HubSpot Integration
 * 
 * This file implements the HubSpot integration using the OAuth2Integration base class.
 * It provides methods for authenticating with HubSpot, revoking tokens, and fetching user information.
 * It also includes methods for working with HubSpot's CRM objects like contacts, companies, and deals.
 */
import { auth, signIn, signOut } from '@/lib/auth';
import { Integration, ExtendedSession, AuthenticationError, isAuthenticatedWithProvider } from './oauth2-base';

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
 * HubSpot integration using NextAuth
 * This class implements HubSpot API interactions using NextAuth for authentication
 */
export class HubSpotIntegration implements Integration {
  private apiVersion = 'v3';
  
  /**
   * Constructor for HubSpotIntegration
   */
  constructor() {
    // No configuration needed as we use NextAuth
  }
  
  /**
   * Get the authentication status for HubSpot
   * @returns Authentication status
   */
  async getAuthStatus(): Promise<{ isAuthenticated: boolean; accountId?: string }> {
    const session = await auth() as ExtendedSession;
    
    if (!session?.user) {
      return { isAuthenticated: false };
    }
    
    // Check if the user is authenticated with HubSpot
    if (isAuthenticatedWithProvider(session, 'hubspot')) {
      return { 
        isAuthenticated: true,
        accountId: session.user.id
      };
    }
    
    return { isAuthenticated: false };
  }
  
  /**
   * Disconnect from HubSpot
   * @returns True if disconnected successfully
   */
  async disconnect(): Promise<boolean> {
    try {
      await signOut({ redirect: false });
      return true;
    } catch (error) {
      console.error('Failed to disconnect from HubSpot:', error);
      return false;
    }
  }
  
  /**
   * Authenticate with HubSpot
   * @returns True if authentication was initiated
   */
  async authenticate(): Promise<boolean> {
    try {
      await signIn('hubspot', { redirect: true });
      return true;
    } catch (error) {
      console.error('Failed to authenticate with HubSpot:', error);
      return false;
    }
  }
  
  /**
   * Get user information from HubSpot
   * @returns User information from HubSpot
   */
  async getUserInfo(): Promise<HubSpotUserInfo | null> {
    const session = await auth() as ExtendedSession;
    
    if (!isAuthenticatedWithProvider(session, 'hubspot')) {
      throw new AuthenticationError('Not authenticated with HubSpot');
    }
    
    const accessToken = session.token!.accessToken!;
    
    // Get user info from HubSpot API
    const response = await fetch('https://api.hubapi.com/integrations/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Get contacts from HubSpot
   * @param limit - Maximum number of contacts to return
   * @returns List of contacts
   */
  async getContacts(limit = 10): Promise<HubSpotContactsResponse> {
    const session = await auth() as ExtendedSession;
    
    if (!isAuthenticatedWithProvider(session, 'hubspot')) {
      throw new AuthenticationError('Not authenticated with HubSpot');
    }
    
    const accessToken = session.token!.accessToken!;
    
    const url = `https://api.hubapi.com/crm/${this.apiVersion}/objects/contacts?limit=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get contacts: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Create a contact in HubSpot
   * @param properties - Contact properties
   * @returns The created contact
   */
  async createContact(properties: Record<string, string>): Promise<HubSpotContact> {
    const session = await auth() as ExtendedSession;
    
    if (!isAuthenticatedWithProvider(session, 'hubspot')) {
      throw new AuthenticationError('Not authenticated with HubSpot');
    }
    
    const accessToken = session.token!.accessToken!;
    
    const url = `https://api.hubapi.com/crm/${this.apiVersion}/objects/contacts`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create contact: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Get deals from HubSpot
   * @param limit - Maximum number of deals to return
   * @returns List of deals
   */
  async getDeals(limit = 10): Promise<HubSpotDealsResponse> {
    const session = await auth() as ExtendedSession;
    
    if (!isAuthenticatedWithProvider(session, 'hubspot')) {
      throw new AuthenticationError('Not authenticated with HubSpot');
    }
    
    const accessToken = session.token!.accessToken!;
    
    const url = `https://api.hubapi.com/crm/${this.apiVersion}/objects/deals?limit=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get deals: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

/**
 * HubSpot contacts response
 */
export interface HubSpotContactsResponse {
  results: HubSpotContact[];
  paging?: {
    next?: {
      after: string;
      link: string;
    };
  };
}

/**
 * HubSpot deals response
 */
export interface HubSpotDealsResponse {
  results: HubSpotDeal[];
  paging?: {
    next?: {
      after: string;
      link: string;
    };
  };
} 