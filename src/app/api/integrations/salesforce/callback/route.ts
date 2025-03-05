import { NextRequest, NextResponse } from 'next/server';
import { SalesforceIntegration } from '@/lib/integrations/salesforce';
import { db } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { getSession } from '@/lib/session/iron-session';

/**
 * Handle GET requests for Salesforce OAuth2 callback
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the authorization code and state from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    // Validate the code and state
    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      );
    }
    
    // Get the user session
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    
    // Get the Iron Session to validate CSRF
    const ironSession = await getSession(request);
    
    // Validate the state parameter to prevent CSRF
    if (!state || state !== ironSession.csrfToken) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 403 }
      );
    }
    
    // Create a Salesforce integration instance
    const salesforce = new SalesforceIntegration();
    
    // Exchange the authorization code for an access token
    const tokens = await salesforce.exchangeCodeForToken(code);
    
    // Get user info from Salesforce
    const userInfo = await salesforce.getUserInfo(tokens.access_token);
    
    // Store the integration in the database
    await db.insert(integrations).values({
      userId: session.user.id,
      type: 'salesforce',
      name: 'Salesforce',
      config: {
        instance_url: tokens.instance_url,
        organization_id: userInfo.organization_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Date.now() + (tokens.expires_in || 7200) * 1000,
      },
      isActive: true,
    });
    
    // Redirect to the integrations page with a success message
    return NextResponse.redirect(
      new URL('/integrations?success=true&provider=salesforce', request.url)
    );
  } catch (error) {
    console.error('Salesforce callback error:', error);
    
    // Redirect to the integrations page with an error message
    return NextResponse.redirect(
      new URL('/integrations?error=true&provider=salesforce', request.url)
    );
  }
} 