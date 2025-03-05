/**
 * Base class for OAuth2 integrations
 * This provides common functionality for all OAuth2 integrations
 */
export abstract class OAuth2Integration {
  protected clientId: string;
  protected clientSecret: string;
  protected redirectUri: string;
  protected scopes: string[];
  protected authorizationUrl: string;
  protected tokenUrl: string;
  
  /**
   * Constructor for OAuth2Integration
   * @param config - Configuration for the OAuth2 integration
   */
  constructor(config: OAuth2IntegrationConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    this.scopes = config.scopes;
    this.authorizationUrl = config.authorizationUrl;
    this.tokenUrl = config.tokenUrl;
  }
  
  /**
   * Get the authorization URL for the OAuth2 flow
   * @param state - A random state string to prevent CSRF
   * @returns The authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const url = new URL(this.authorizationUrl);
    
    url.searchParams.append('client_id', this.clientId);
    url.searchParams.append('redirect_uri', this.redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', this.scopes.join(' '));
    url.searchParams.append('state', state);
    
    return url.toString();
  }
  
  /**
   * Exchange an authorization code for an access token
   * @param code - The authorization code from the OAuth2 provider
   * @returns The OAuth2 tokens
   */
  async exchangeCodeForToken(code: string): Promise<OAuth2Tokens> {
    const params = new URLSearchParams();
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', this.redirectUri);
    
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to exchange code for token: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Refresh an access token using a refresh token
   * @param refreshToken - The refresh token
   * @returns The new OAuth2 tokens
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuth2Tokens> {
    const params = new URLSearchParams();
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Revoke an access token
   * @param token - The access token to revoke
   * @returns True if the token was revoked successfully
   */
  abstract revokeToken(token: string): Promise<boolean>;
  
  /**
   * Get user information from the OAuth2 provider
   * @param accessToken - The access token
   * @returns User information from the provider
   */
  abstract getUserInfo(accessToken: string): Promise<Record<string, unknown>>;
}

/**
 * Configuration for OAuth2 integrations
 */
export interface OAuth2IntegrationConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
}

/**
 * OAuth2 tokens returned from the provider
 */
export interface OAuth2Tokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  [key: string]: unknown;
} 