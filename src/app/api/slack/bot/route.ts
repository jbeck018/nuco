import { NextRequest, NextResponse } from 'next/server';
import { createSlackIntegration } from '@/lib/integrations/slack';
import { createSlackAgentAdapter } from '@/lib/ai/agents/adapters/slack';
import { createSlackAnalyticsService } from '@/lib/slack/analytics-service';
import { NeucoAgent } from '@/lib/ai/agents/slack/neuco-agent';
import { AIService } from '@/lib/ai/service';
import { z } from 'zod';

// Create services
const analyticsService = createSlackAnalyticsService();

// Define interfaces for Slack event types
interface SlackEvent {
  type: string;
  [key: string]: unknown;
}

// Define request schema
const requestSchema = z.object({
  event: z.object({
    type: z.string(),
    user: z.string(),
    text: z.string(),
    channel: z.string(),
    ts: z.string(),
    thread_ts: z.string().optional(),
    team: z.string(),
  }),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const { event } = requestSchema.parse(body);

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

    // Create the Slack agent adapter
    const adapter = createSlackAgentAdapter(slack);

    // Create and register the NeucoAgent
    const neucoAgent = new NeucoAgent({
      id: 'neuco',
      name: 'Neuco Agent',
      description: 'Handles /neuco commands in Slack',
      model: 'gpt-4',
      aiService: new AIService(),
    });
    adapter.registerAgent('neuco', neucoAgent);

    // Handle the message
    await adapter.handleMessage({
      channelId: event.channel,
      threadTs: event.thread_ts,
      userId: event.user,
      teamId: event.team,
      message: event.text,
      command: event.text.startsWith('/') ? event.text.split(' ')[0].slice(1) : undefined,
      args: event.text.startsWith('/') ? event.text.split(' ').slice(1) : undefined,
      metadata: {
        userId: event.user,
      },
    });

    // Return a success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling Slack event:', error);
    return NextResponse.json(
      { error: 'Failed to process Slack event' },
      { status: 500 }
    );
  }
}