import { NextRequest, NextResponse } from 'next/server';
import { createSlackIntegration } from '@/lib/integrations/slack';
import { db } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

/**
 * Handle GET requests for Slack OAuth callback
 * This endpoint will be called by Slack after the user authorizes the app
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Check for errors
    if (error) {
      console.error('Slack OAuth error:', error);
      return NextResponse.redirect(new URL('/settings/integrations?error=slack_oauth_error', request.url));
    }
    
    // Validate required parameters
    if (!code || !state) {
      console.error('Missing code or state parameter');
      return NextResponse.redirect(new URL('/settings/integrations?error=missing_parameters', request.url));
    }
    
    // Get the session
    const session = await auth();
    
    if (!session?.user?.id) {
      console.error('User not authenticated');
      return NextResponse.redirect(new URL('/login?callbackUrl=/settings/integrations', request.url));
    }

    // At this point we know session.user is defined
    const userId = session.user.id;
    const organizationId = session.user.defaultOrganizationId || '';
    
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
        'incoming-webhook',
      ],
    });
    
    // Get the redirect URI
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/oauth/callback`;
    
    // Exchange the code for tokens
    const slackConfig = await slack.handleCallback(code, redirectUri);
    
    // Check if we already have an integration for this team
    const existingIntegrations = await db.query.integrations.findMany({
      where: (integrations, { eq }) => 
        eq(integrations.type, 'slack') && 
        eq(integrations.userId, userId)
    });
    
    // Filter for the specific team_id if we have multiple integrations
    const matchingIntegration = existingIntegrations.find(
      integration => (integration.config as Record<string, unknown>)?.team_id === slackConfig.teamId
    );
    
    if (matchingIntegration) {
      // Update the existing integration
      await db
        .update(integrations)
        .set({
          config: {
            ...(matchingIntegration.config as Record<string, unknown>),
            access_token: slackConfig.accessToken,
            refresh_token: slackConfig.refreshToken,
            expires_at: slackConfig.expiresAt,
            webhook_url: slackConfig.webhookUrl,
            bot_user_id: slackConfig.botUserId,
          },
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, matchingIntegration.id));
    } else {
      // Create a new integration
      await db.insert(integrations).values({
        type: 'slack',
        name: `Slack - ${slackConfig.teamName}`,
        userId: userId,
        organizationId: organizationId,
        isActive: true,
        config: {
          team_id: slackConfig.teamId,
          team_name: slackConfig.teamName,
          access_token: slackConfig.accessToken,
          refresh_token: slackConfig.refreshToken,
          expires_at: slackConfig.expiresAt,
          webhook_url: slackConfig.webhookUrl,
          bot_user_id: slackConfig.botUserId,
        },
      });
    }
    
    // Redirect to the integrations page
    return NextResponse.redirect(new URL('/settings/integrations?success=slack_connected', request.url));
    
  } catch (error) {
    console.error('Slack OAuth callback error:', error);
    return NextResponse.redirect(new URL('/settings/integrations?error=slack_oauth_error', request.url));
  }
} 