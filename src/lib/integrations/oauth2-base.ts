/**
 * NextAuth Integration Base
 * This provides common types and utilities for integrations using NextAuth
 */

import { Session } from 'next-auth';

/**
 * Extended session type that includes token information
 */
export interface ExtendedSession extends Session {
  token?: {
    accessToken?: string;
    provider?: string;
    [key: string]: unknown;
  };
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    [key: string]: unknown;
  };
}

/**
 * Base interface for all integrations
 */
export interface Integration {
  /**
   * Get the authentication status for the integration
   * @returns Authentication status
   */
  getAuthStatus(): Promise<{ isAuthenticated: boolean; accountId?: string }>;
  
  /**
   * Disconnect from the integration
   * @returns True if disconnected successfully
   */
  disconnect(): Promise<boolean>;
}

/**
 * Common error types for integrations
 */
export class IntegrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export class AuthenticationError extends IntegrationError {
  constructor(message = 'Not authenticated with the integration') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ApiError extends IntegrationError {
  statusCode?: number;
  
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Helper function to check if a session is authenticated with a specific provider
 * @param session - The session object
 * @param provider - The provider name
 * @returns True if authenticated with the provider
 */
export function isAuthenticatedWithProvider(session: ExtendedSession | null, provider: string): boolean {
  if (!session?.token?.accessToken || session.token?.provider !== provider) {
    return false;
  }
  
  return true;
}

/**
 * Helper function to get the access token for a specific provider
 * @param session - The session object
 * @param provider - The provider name
 * @returns The access token or null if not authenticated
 */
export function getAccessToken(session: ExtendedSession | null, provider: string): string | null {
  if (!isAuthenticatedWithProvider(session, provider)) {
    return null;
  }
  
  return session?.token?.accessToken || null;
} 