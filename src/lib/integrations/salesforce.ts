/* cSpell:ignore SOQL sobjects */
import { auth, signIn, signOut } from '@/lib/auth';
import { Integration, ExtendedSession, AuthenticationError, isAuthenticatedWithProvider } from './oauth2-base';

/**
 * Salesforce integration using NextAuth
 * This class implements Salesforce API interactions using NextAuth for authentication
 */
export class SalesforceIntegration implements Integration {
  private apiVersion = 'v56.0';
  
  /**
   * Constructor for SalesforceIntegration
   */
  constructor() {
    // No configuration needed as we use NextAuth
  }
  
  /**
   * Get the authentication status for Salesforce
   * @returns Authentication status
   */
  async getAuthStatus(): Promise<{ isAuthenticated: boolean; accountId?: string }> {
    const session = await auth() as ExtendedSession;
    
    if (!session?.user) {
      return { isAuthenticated: false };
    }
    
    // Check if the user is authenticated with Salesforce
    if (isAuthenticatedWithProvider(session, 'salesforce')) {
      return { 
        isAuthenticated: true,
        accountId: session.user.id
      };
    }
    
    return { isAuthenticated: false };
  }
  
  /**
   * Disconnect from Salesforce
   * @returns True if disconnected successfully
   */
  async disconnect(): Promise<boolean> {
    try {
      await signOut({ redirect: false });
      return true;
    } catch (error) {
      console.error('Failed to disconnect from Salesforce:', error);
      return false;
    }
  }
  
  /**
   * Authenticate with Salesforce
   * @returns True if authentication was initiated
   */
  async authenticate(): Promise<boolean> {
    try {
      await signIn('salesforce', { redirect: true });
      return true;
    } catch (error) {
      console.error('Failed to authenticate with Salesforce:', error);
      return false;
    }
  }
  
  /**
   * Get user information from Salesforce
   * @returns User information from Salesforce
   */
  async getUserInfo(): Promise<SalesforceUserInfo | null> {
    const session = await auth() as ExtendedSession;
    
    if (!isAuthenticatedWithProvider(session, 'salesforce')) {
      throw new AuthenticationError('Not authenticated with Salesforce');
    }
    
    const accessToken = session.token!.accessToken!;
    
    // Get instance URL from user info endpoint
    const userInfoUrl = 'https://login.salesforce.com/services/oauth2/userinfo';
    const response = await fetch(userInfoUrl, {
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
   * @param query - The SOQL query
   * @returns The query results
   */
  async query(query: string): Promise<SalesforceQueryResult> {
    const session = await auth() as ExtendedSession;
    
    if (!isAuthenticatedWithProvider(session, 'salesforce')) {
      throw new AuthenticationError('Not authenticated with Salesforce');
    }
    
    const accessToken = session.token!.accessToken!;
    
    // Get instance URL from user info
    const userInfo = await this.getUserInfo();
    if (!userInfo?.instance_url) {
      throw new Error('Failed to get Salesforce instance URL');
    }
    
    const instanceUrl = userInfo.instance_url;
    const encodedQuery = encodeURIComponent(query);
    const url = `${instanceUrl}/services/data/${this.apiVersion}/query?q=${encodedQuery}`;
    
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
   * @param objectName - The Salesforce object name (e.g., 'Account')
   * @param data - The record data
   * @returns The created record
   */
  async createRecord(
    objectName: string,
    data: Record<string, unknown>
  ): Promise<SalesforceCreateResult> {
    const session = await auth() as ExtendedSession;
    
    if (!session?.token?.accessToken || session.token?.provider !== 'salesforce') {
      throw new Error('Not authenticated with Salesforce');
    }
    
    const accessToken = session.token.accessToken;
    
    // Get instance URL from user info
    const userInfo = await this.getUserInfo();
    if (!userInfo?.instance_url) {
      throw new Error('Failed to get Salesforce instance URL');
    }
    
    const instanceUrl = userInfo.instance_url;
    const url = `${instanceUrl}/services/data/${this.apiVersion}/sobjects/${objectName}`;
    
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
  instance_url?: string;
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