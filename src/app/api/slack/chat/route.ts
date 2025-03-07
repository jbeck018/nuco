import { NextRequest, NextResponse } from 'next/server';
import { createSlackIntegration } from '@/lib/integrations/slack';
import { db } from '@/lib/db';
import { OpenAI } from 'openai';

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Handle POST requests for Slack chat commands
 * This endpoint will be called by the Slack bot to process chat messages
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { message, channelId, threadTs, integrationId } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Get the Slack integration from the database
    const integration = integrationId 
      ? await db.query.integrations.findFirst({
          where: (integrations, { eq }) => eq(integrations.id, integrationId)
        })
      : await db.query.integrations.findFirst({
          where: (integrations, { eq, and }) => 
            and(
              eq(integrations.type, 'slack'),
              eq(integrations.isActive, true)
            )
        });
    
    if (!integration) {
      return NextResponse.json(
        { error: 'Slack integration not found' },
        { status: 404 }
      );
    }
    
    // Cast the config to the expected type
    const config = integration.config as Record<string, unknown>;
    
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
      teamId: config.team_id as string,
      teamName: config.team_name as string,
      botUserId: config.bot_user_id as string,
      webhookUrl: config.webhook_url as string,
    });
    
    // Send a typing indicator
    await slack.sendMessage({
      channel: channelId,
      text: '...',
      thread_ts: threadTs,
    });
    
    // Generate a response using OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant integrated with Slack. Provide concise, accurate responses to user queries. Format your responses using Slack markdown when appropriate.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7,
    });
    
    // Get the response content
    const responseContent = response.choices[0].message.content || 'No response generated';
    
    // Send the response to Slack
    await slack.sendMessage({
      channel: channelId,
      text: responseContent,
      thread_ts: threadTs,
    });
    
    // Return a success response
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Slack chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests for Slack chat commands
 * This is just a placeholder to satisfy the route handler requirements
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ message: 'Use POST to chat with the AI' });
} 