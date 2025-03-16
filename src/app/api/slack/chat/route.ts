export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createSlackIntegration } from '@/lib/integrations/slack';
import { db } from '@/lib/db';
import { generateCompletion } from '@/lib/ai/service';
import { AIServiceError } from '@/lib/ai/error';
import { StreamTextResult, ToolSet } from 'ai';

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
      if (done) break;
      
      // Extract the text from the data chunk based on the format
      if (value) {
        if (typeof value === 'object' && value !== null) {
          // Type guard to ensure value is a non-null object
          const obj = value as Record<string, any>;
          
          if ('text' in obj && typeof obj.text === 'string') {
            // Standard Vercel AI SDK format
            result += obj.text;
          } else if ('delta' in obj && obj.delta && typeof obj.delta === 'object' && 
                    'content' in obj.delta && typeof obj.delta.content === 'string') {
            // Delta format (used by some providers)
            result += obj.delta.content;
          } else if ('content' in obj && typeof obj.content === 'string') {
            // Direct content format
            result += obj.content;
          } else if ('choices' in obj && Array.isArray(obj.choices) && 
                    obj.choices.length > 0 && 
                    obj.choices[0] && typeof obj.choices[0] === 'object' &&
                    obj.choices[0].delta && typeof obj.choices[0].delta === 'object' &&
                    'content' in obj.choices[0].delta && 
                    typeof obj.choices[0].delta.content === 'string') {
            // Raw OpenAI format
            result += obj.choices[0].delta.content;
          }
        } else if (typeof value === 'string') {
          // Plain text format
          result += value;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  
  // Clean up any remaining formatting markers
  return cleanLLMResponse(result);
}

/**
 * Clean the LLM response by removing metadata and formatting markers
 * @param response The raw response from the LLM
 * @returns Cleaned markdown text
 */
function cleanLLMResponse(response: string): string {
  // If the response is empty, return empty string
  if (!response) return '';
  
  try {
    // Handle the OpenAI-specific format with prefixes like f:, 0:, e:
    if (response.includes('f:') && response.includes('0:')) {
      let cleanedText = '';
      
      // Split the response by spaces to process each token
      const parts = response.split(' ');
      
      for (const part of parts) {
        // Check if this part contains actual content (starts with 0:")
        if (part.startsWith('0:"')) {
          // Extract the content between quotes
          const content = part.substring(3); // Remove the '0:"' prefix
          
          // If the content ends with a quote, remove it
          const cleanContent = content.endsWith('"') 
            ? content.substring(0, content.length - 1) 
            : content;
          
          cleanedText += cleanContent + ' ';
        }
        // Handle content that doesn't have a prefix but is part of the actual message
        else if (!part.startsWith('f:') && !part.startsWith('e:') && !part.startsWith('d:')) {
          // This might be content without a prefix or continuation
          if (part.startsWith('"') || (!part.includes('{') && !part.includes('}'))) {
            // Remove surrounding quotes if present
            const cleanContent = part.replace(/^"|"$/g, '');
            cleanedText += cleanContent + ' ';
          }
        }
      }
      
      return cleanedText.trim();
    }
    
    // If no special format is detected, return the original response
    return response;
  } catch (error) {
    console.error('Error cleaning LLM response:', error);
    // Return the original response if parsing fails
    return response;
  }
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
      // Define the system prompt for Slack
      const systemPrompt = 'You are a helpful AI assistant integrated with Slack. Provide concise, accurate responses to user queries. Format your responses using Slack markdown when appropriate.';
      
      // Generate a response using the AI service
      const stream = await generateCompletion(
        [
          {
            role: 'user',
            content: message,
          }
        ],
        {
          modelId: 'gpt-4o', // Default model
          systemPrompt,
          temperature: 0.7,
          organizationId: orgId,
          useCustomTokens,
          customTokens
        }
      );
      
      // Convert the stream to a string using our custom function
      const responseContent = await streamTextResultToString(stream);
      
      // Send the response to Slack
      await slack.sendMessage({
        channel: channelId,
        text: responseContent || 'No response generated',
        thread_ts: threadTs,
      });
      
      // Return a success response
      return NextResponse.json({ success: true });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      let errorMessage = 'An error occurred while generating a response.';
      
      if (aiError instanceof AIServiceError) {
        // Handle specific AI service errors
        if (aiError.type === 'token_limit_exceeded') {
          errorMessage = "⚠️ Token limit exceeded. Your organization has reached its monthly token usage limit. Please purchase more tokens or add a custom API key.";
        } else {
          errorMessage = `⚠️ ${aiError.message}`;
        }
      }
      
      // Send the error message to Slack
      await slack.sendMessage({
        channel: channelId,
        text: errorMessage,
        thread_ts: threadTs,
      });
      
      // Return a success response since we've handled the error by sending a message to Slack
      return NextResponse.json({ success: true, message: 'Error message sent to Slack' });
    }
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