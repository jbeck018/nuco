export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createSlackIntegration } from '@/lib/integrations/slack';
import { db } from '@/lib/db';
import { AIServiceError } from '@/lib/ai/error';
import { StreamTextResult, ToolSet } from 'ai';
import { AgentFactory } from '@/lib/ai/agents/factory';
import { Message } from '@/lib/ai/service';
import { AgentContext } from '@/lib/ai/agents/base';
import { AIService } from '@/lib/ai/service';

/**
 * Custom function to convert StreamTextResult to string
 * This is needed because StreamTextResult doesn't implement AsyncIterable<string> directly
 * and we need to parse the special format of the LLM responses
 */
async function streamTextResultToString(stream: StreamTextResult<ToolSet, never>): Promise<string> {
  let result = '';
  
  // Use the built-in toDataStream method to get a ReadableStream
  const dataStream = stream.toDataStream();
  
  // Create a reader from the stream
  const reader = dataStream.getReader();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      // Decode the chunk and add it to the result
      const chunk = new TextDecoder().decode(value);
      result += chunk;
    }
  } finally {
    reader.releaseLock();
  }
  
  return result;
}

/**
 * Handle POST requests for Slack chat commands
 * This endpoint will be called by the Slack bot to process chat messages
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { message, channelId, threadTs, integrationId, organizationId } = body;
    
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
    
    // Get the organization ID from the integration if not provided
    const orgId = organizationId || integration.organizationId;
    
    // Check if the organization has custom tokens enabled
    let useCustomTokens = false;
    let customTokens = undefined;
    
    if (orgId) {
      const orgSettings = await db.query.organizationSettings.findFirst({
        where: (settings, { eq }) => eq(settings.organizationId, orgId),
      });
      
      useCustomTokens = orgSettings?.aiSettings?.useCustomTokens || false;
      customTokens = orgSettings?.aiSettings?.customTokens;
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
    
    try {
      // Create agent factory
      const agentFactory = AgentFactory.getInstance({
        defaultModelId: 'gpt-4',
        defaultSystemPrompt: 'You are a helpful AI assistant integrated with Slack. Provide concise, accurate responses to user queries. Format your responses using Slack markdown when appropriate.',
        metadata: {
          organizationId: orgId,
        },
      });

      // Create a default agent
      const agent = await agentFactory.createAgent('default', {
        modelConfig: {
          id: 'gpt-4',
          name: 'GPT-4',
          provider: 'openai',
          contextWindow: 128000,
          maxOutputTokens: 4096,
          temperature: 0.7,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
          costPer1kInput: 0.01,
          costPer1kOutput: 0.03,
        },
      });

      // Convert message to the correct type
      const messages: Message[] = [{
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        createdAt: new Date(),
      }];

      // Create agent context
      const context: AgentContext = {
        messages,
        state: {
          id: crypto.randomUUID(),
          status: 'running',
          lastUpdated: new Date(),
          metadata: {},
        },
        config: {
          id: crypto.randomUUID(),
          name: 'default',
          description: 'Default agent for handling Slack messages',
          model: 'gpt-4',
          aiService: new AIService(),
        },
        metadata: {
          channelId,
          threadTs,
          userId: config.bot_user_id as string,
          teamId: config.team_id as string,
        },
        executionId: crypto.randomUUID(),
      };

      // Execute the agent
      const result = await agent.execute(context);

      // Send the response to Slack
      await slack.sendMessage({
        channel: channelId,
        text: typeof result === 'string' ? result : 'No response generated',
        thread_ts: threadTs,
      });
      
      // Return a success response
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Handle specific AI service errors
      if (error instanceof AIServiceError) {
        return NextResponse.json(
          { 
            error: error.message,
            type: error.type,
            code: error.code
          },
          { status: 500 }
        );
      }
      
      // Handle generic errors
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API route error:', error);
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