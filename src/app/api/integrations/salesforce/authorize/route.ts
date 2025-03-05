/**
 * Salesforce Authorization Route
 * 
 * This file handles the authorization request for Salesforce integration.
 * It generates an authorization URL and redirects the user to Salesforce's OAuth page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SalesforceIntegration } from '@/lib/integrations/salesforce';
import { getSession } from '@/lib/session/iron-session';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';

/**
 * GET handler for the Salesforce authorization route
 * @param request The incoming request
 * @returns A response redirecting to the Salesforce authorization URL
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
    const ironSession = await getSession(request);
    
    // Generate a state parameter to prevent CSRF attacks
    const state = nanoid();
    
    // Store the state in the session
    ironSession.csrfToken = state;
    await ironSession.save();

    // Create a Salesforce integration instance
    const salesforceIntegration = new SalesforceIntegration();

    // Generate the authorization URL
    const authorizationUrl = salesforceIntegration.getAuthorizationUrl(state);

    // Redirect to the authorization URL
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error('Error generating Salesforce authorization URL:', error);
    
    // Redirect to the integrations page with an error message
    return NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent('Failed to connect to Salesforce')}`,
        request.url
      )
    );
  }
} 