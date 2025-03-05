import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSlackIntegration } from '@/lib/integrations/slack';

/**
 * Handle POST requests to initiate Slack OAuth connection
 * This endpoint generates the OAuth URL for the user to connect their Slack workspace
 */
export async function POST(): Promise<NextResponse> {
  try {
    // Get the user's session
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Create a Slack integration instance
    const slack = createSlackIntegration({
      clientId: process.env.SLACK_CLIENT_ID || '',
      clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      signingSecret: process.env.SLACK_SIGNING_SECRET || '',
      scopes: [
        'chat:write',
        'channels:read',
        'users:read',
        'team:read',
        'chat:write.public',
        'commands',
        'incoming-webhook',
      ],
    });
    
    // Generate the OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/oauth/callback`;
    const state = JSON.stringify({
      userId: session.user.id,
      organizationId: session.user.defaultOrganizationId,
    });
    
    const url = slack.getSlackAuthorizationUrl(redirectUri, state);
    
    return NextResponse.json({ url });
    
  } catch (error) {
    console.error('Slack OAuth connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests (not used but required for Next.js API routes)
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
} 