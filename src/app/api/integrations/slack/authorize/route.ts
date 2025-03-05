import { NextRequest, NextResponse } from 'next/server';
import { createSlackIntegration } from '@/lib/integrations/slack';
import { auth } from '@/lib/auth';
import { getSession } from '@/lib/session/iron-session';
import { randomBytes } from 'crypto';

/**
 * Handle GET requests for Slack OAuth2 authorization
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the user session
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    
    // Generate a CSRF token
    const csrfToken = randomBytes(32).toString('hex');
    
    // Store the CSRF token in the session
    const ironSession = await getSession();
    ironSession.csrfToken = csrfToken;
    await ironSession.save();
    
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
    
    // Get the authorization URL
    const authUrl = slack.getSlackAuthorizationUrl(redirectUri, csrfToken);
    
    // Redirect to the authorization URL
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Slack authorization error:', error);
    
    // Redirect to the integrations page with an error message
    return NextResponse.redirect(
      new URL('/integrations?error=true&provider=slack', request.url)
    );
  }
} 