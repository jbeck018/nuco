import { NextRequest, NextResponse } from 'next/server';
import { createSlackIntegration } from '@/lib/integrations/slack';
import { db } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { getSession } from '@/lib/session/iron-session';

/**
 * Handle GET requests for Slack OAuth2 callback
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
    const ironSession = await getSession();
    
    // Validate the state parameter to prevent CSRF
    if (!state || state !== ironSession.csrfToken) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 403 }
      );
    }
    
    // Create a Slack integration instance
    const slack = createSlackIntegration({
      clientId: process.env.SLACK_CLIENT_ID || '',
      clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      scopes: [
        'chat:write',
        'channels:read',
        'users:read',
        'team:read',
        'chat:write.public',
        'incoming-webhook',
      ],
    });
    
    // Get the redirect URI
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`;
    
    // Exchange the authorization code for an access token
    const config = await slack.handleCallback(code, redirectUri);
    
    // Store the integration in the database
    await db.insert(integrations).values({
      userId: session.user.id,
      organizationId: session.user.defaultOrganizationId,
      type: 'slack',
      name: 'Slack',
      config: {
        access_token: config.accessToken,
        refresh_token: config.refreshToken,
        expires_at: config.expiresAt,
        team_id: config.teamId,
        team_name: config.teamName,
        bot_user_id: config.botUserId,
        webhook_url: config.webhookUrl,
      },
      isActive: true,
    });
    
    // Redirect to the integrations page with a success message
    return NextResponse.redirect(
      new URL('/integrations?success=true&provider=slack', request.url)
    );
  } catch (error) {
    console.error('Slack callback error:', error);
    
    // Redirect to the integrations page with an error message
    return NextResponse.redirect(
      new URL('/integrations?error=true&provider=slack', request.url)
    );
  }
} 