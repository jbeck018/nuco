/**
 * HubSpot Authorization Route
 * 
 * This file handles the authorization request for HubSpot integration.
 * It generates an authorization URL and redirects the user to HubSpot's OAuth page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { HubSpotIntegration } from '@/lib/integrations/hubspot';
import { getSession } from '@/lib/session/iron-session';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';

/**
 * GET handler for the HubSpot authorization route
 * @param request The incoming request
 * @returns A response redirecting to the HubSpot authorization URL
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the user session from NextAuth
    const session = await auth();
    
    // Check if the user is authenticated
    if (!session?.user?.id) {
      console.error('User not authenticated');
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Get the Iron Session for CSRF protection
    const ironSession = await getSession();
    
    // Generate a state parameter to prevent CSRF attacks
    const state = nanoid();
    
    // Store the state in the session
    ironSession.csrfToken = state;
    await ironSession.save();

    // Create a HubSpot integration instance
    const hubspotIntegration = new HubSpotIntegration();

    // Generate the authorization URL
    const authorizationUrl = hubspotIntegration.getAuthorizationUrl(state);

    // Redirect to the authorization URL
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error('Error generating HubSpot authorization URL:', error);
    
    // Redirect to the integrations page with an error message
    return NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent('Failed to connect to HubSpot')}`,
        request.url
      )
    );
  }
} 