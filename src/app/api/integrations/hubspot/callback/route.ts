/**
 * HubSpot OAuth Callback Handler
 * 
 * This file handles the OAuth callback from HubSpot after a user authorizes the application.
 * It exchanges the authorization code for access and refresh tokens, retrieves user information,
 * and stores the integration details in the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { HubSpotIntegration } from '@/lib/integrations/hubspot';
import { db } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { getSession } from '@/lib/session/iron-session';
import { auth } from '@/lib/auth';

/**
 * GET handler for the HubSpot OAuth callback
 * @param request The incoming request
 * @returns A response redirecting to the integrations page
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Get the authorization code and state from the query parameters
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Validate the authorization code
  if (!code) {
    console.error('No authorization code provided');
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent('No authorization code provided')}`, request.url)
    );
  }

  // Validate the state parameter to prevent CSRF attacks
  if (!state) {
    console.error('No state parameter provided');
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent('Invalid state parameter')}`, request.url)
    );
  }

  try {
    // Get the user session from NextAuth
    const session = await auth();
    
    // Check if the user is authenticated
    if (!session?.user?.id) {
      console.error('User not authenticated');
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    
    // Get the Iron Session for CSRF validation
    const ironSession = await getSession(request);
    
    // Validate the state parameter against the stored CSRF token
    if (state !== ironSession.csrfToken) {
      console.error('Invalid state parameter');
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent('Invalid state parameter')}`, request.url)
      );
    }

    // Create a HubSpot integration instance
    const hubspotIntegration = new HubSpotIntegration();

    // Exchange the authorization code for access and refresh tokens
    const tokens = await hubspotIntegration.exchangeCodeForToken(code);

    // Get user information from HubSpot
    const userInfo = await hubspotIntegration.getUserInfo(tokens.access_token);

    // Calculate the expiration time, defaulting to 1 hour if expires_in is undefined
    const expiresIn = tokens.expires_in || 3600; // Default to 1 hour if not provided
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Store the integration in the database
    await db.insert(integrations)
      .values({
        userId: session.user.id,
        type: 'hubspot',
        name: `HubSpot - ${userInfo.hub_name}`,
        config: {
          hub_id: userInfo.hub_id,
          hub_domain: userInfo.hub_domain,
          scopes: userInfo.scopes,
          // Store credentials in the config field
          credentials: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: expiresAt,
          }
        },
        isActive: true,
      })
      .returning();

    // Redirect to the integrations page with a success message
    return NextResponse.redirect(
      new URL(
        `/integrations?success=${encodeURIComponent('HubSpot integration connected successfully')}`,
        request.url
      )
    );
  } catch (error) {
    console.error('Error connecting HubSpot integration:', error);
    
    // Redirect to the integrations page with an error message
    return NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent('Failed to connect HubSpot integration')}`,
        request.url
      )
    );
  }
} 