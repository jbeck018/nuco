/* cSpell:ignore SOQL sobjects */
import { OAuth2Integration, OAuth2IntegrationConfig } from './oauth2-base';

/**
 * Salesforce OAuth2 integration
 * This class implements the OAuth2 flow for Salesforce
 */
export class SalesforceIntegration extends OAuth2Integration {
  private revokeTokenUrl: string;
  private userInfoUrl: string;
  
  /**
   * Constructor for SalesforceIntegration
   * @param config - Configuration for the Salesforce integration
   */
  constructor(config: Partial<OAuth2IntegrationConfig> = {}) {
    // Default configuration for Salesforce
    const defaultConfig: OAuth2IntegrationConfig = {
      clientId: process.env.SALESFORCE_CLIENT_ID || '',
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
      redirectUri: `${process.env.NEXTAUTH_URL}/api/integrations/salesforce/callback`,
      scopes: ['api', 'refresh_token'],
      authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    };
    
    // Merge default config with provided config
    super({ ...defaultConfig, ...config });
    
    // Salesforce-specific endpoints
    this.revokeTokenUrl = 'https://login.salesforce.com/services/oauth2/revoke';
    this.userInfoUrl = 'https://login.salesforce.com/services/oauth2/userinfo';
  }
  
  /**
   * Revoke a Salesforce access token
   * @param token - The access token to revoke
   * @returns True if the token was revoked successfully
   */
  async revokeToken(token: string): Promise<boolean> {
    const params = new URLSearchParams();
    params.append('token', token);
    
    const response = await fetch(this.revokeTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    return response.ok;
  }
  
  /**
   * Get user information from Salesforce
   * @param accessToken - The access token
   * @returns User information from Salesforce
   */
  async getUserInfo(accessToken: string): Promise<SalesforceUserInfo> {
    const response = await fetch(this.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Query Salesforce data using SOQL
   * @param accessToken - The access token
   * @param instanceUrl - The Salesforce instance URL
   * @param query - The SOQL query
   * @returns The query results
   */
  async query(accessToken: string, instanceUrl: string, query: string): Promise<SalesforceQueryResult> {
    const encodedQuery = encodeURIComponent(query);
    const url = `${instanceUrl}/services/data/v56.0/query?q=${encodedQuery}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Salesforce query failed: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Create a record in Salesforce
   * @param accessToken - The access token
   * @param instanceUrl - The Salesforce instance URL
   * @param objectName - The Salesforce object name (e.g., 'Account')
   * @param data - The record data
   * @returns The created record
   */
  async createRecord(
    accessToken: string,
    instanceUrl: string,
    objectName: string,
    data: Record<string, unknown>
  ): Promise<SalesforceCreateResult> {
    const url = `${instanceUrl}/services/data/v56.0/sobjects/${objectName}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create record: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

/**
 * Salesforce user information
 */
export interface SalesforceUserInfo {
  id: string;
  user_id: string;
  organization_id: string;
  username: string;
  display_name: string;
  email: string;
  [key: string]: unknown;
}

/**
 * Salesforce query result
 */
export interface SalesforceQueryResult {
  totalSize: number;
  done: boolean;
  records: Record<string, unknown>[];
}

/**
 * Salesforce create result
 */
export interface SalesforceCreateResult {
  id: string;
  success: boolean;
  errors: string[];
} 