import { NextRequest, NextResponse } from 'next/server';
import { createSlackIntegration, SlackIntegration } from '@/lib/integrations/slack';
import { db } from '@/lib/db';
import { getMessageReactions } from '@/lib/ai/sentiment';
import { createThreadManager } from '@/lib/slack/thread-manager';
import { createSlackAnalyticsService } from '@/lib/slack/analytics-service';

// Create analytics service
const analyticsService = createSlackAnalyticsService();

// Define interfaces for Slack event types
interface SlackEvent {
  type: string;
  [key: string]: unknown;
}

interface SlackMessageEvent extends SlackEvent {
  user: string;
  text: string;
  channel: string;
  ts: string;
  bot_id?: string;
  subtype?: string;
  thread_ts?: string;
}

interface SlackAppMentionEvent extends SlackEvent {
  user: string;
  text: string;
  channel: string;
  ts: string;
  thread_ts?: string;
}

interface SlackEventCallback {
  type: string;
  event: SlackEvent;
  team_id: string;
  [key: string]: unknown;
}

interface SlackSlashCommand {
  command: string;
  text: string;
  user_id: string;
  channel_id: string;
  response_url: string;
  [key: string]: unknown;
}

interface SlackAction {
  action_id: string;
  value: string;
  type: string;
  [key: string]: unknown;
}

interface SlackUser {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface SlackChannel {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface SlackInteractivePayload {
  type: string;
  actions?: SlackAction[];
  user: SlackUser;
  channel: SlackChannel;
  response_url: string;
  [key: string]: unknown;
}

/**
 * Handle POST requests for Slack bot events and commands
 * This endpoint will be used as the Events API URL and slash command URL
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the request body as text for signature verification
    const bodyText = await request.text();
    const body = JSON.parse(bodyText);
    
    // Get the Slack signature and timestamp from headers
    const signature = request.headers.get('x-slack-signature');
    const timestamp = request.headers.get('x-slack-request-timestamp');
    
    // Validate the request
    if (!signature || !timestamp) {
      console.error('Missing Slack signature or timestamp');
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }
    
    // Get the Slack integration from the database
    // For now, we'll use the first active Slack integration we find
    // In a production app, you'd want to look up the integration by team ID
    const integration = await db.query.integrations.findFirst({
      where: (integrations, { eq, and }) => 
        and(
          eq(integrations.type, 'slack'),
          eq(integrations.isActive, true)
        )
    });
    
    if (!integration) {
      console.error('No active Slack integration found');
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
    
    // Verify the request signature
    const isValid = slack.verifySignature(signature, timestamp, bodyText);
    
    if (!isValid) {
      console.error('Invalid Slack signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }
    
    // Handle different types of requests
    if (body.type === 'url_verification') {
      // Handle URL verification challenge
      return NextResponse.json({ challenge: body.challenge });
    } else if (body.type === 'event_callback') {
      // Handle event callbacks
      return handleEventCallback(body as SlackEventCallback, slack);
    } else if (body.command) {
      // Handle slash commands
      return handleSlashCommand(body as SlackSlashCommand, slack);
    } else if (body.payload) {
      // Handle interactive components
      const payload = JSON.parse(body.payload) as SlackInteractivePayload;
      return handleInteractiveComponent(payload);
    }
    
    // Default response for unhandled request types
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Slack bot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle Slack event callbacks
 */
async function handleEventCallback(body: SlackEventCallback, slack: SlackIntegration): Promise<NextResponse> {
  const event = body.event;
  
  // Handle different event types
  switch (event.type) {
    case 'message':
      if (!('bot_id' in event) && !('subtype' in event)) {
        // Only process messages from users (not bots or system messages)
        await processMessage(event as SlackMessageEvent, slack);
      }
      break;
    case 'app_mention':
      await processAppMention(event as SlackAppMentionEvent, slack);
      break;
    // Add more event types as needed
  }
  
  // Acknowledge the event
  return NextResponse.json({ success: true });
}

/**
 * Handle Slack slash commands
 */
async function handleSlashCommand(body: SlackSlashCommand, slack: SlackIntegration): Promise<NextResponse> {
  const { command, text, user_id, channel_id } = body;
  
  // Track command usage
  await analyticsService.trackEvent({
    eventType: `command_${command}`,
    integrationId: slack.getIntegrationId(),
    slackUserId: user_id,
    slackChannelId: channel_id,
    slackTeamId: slack.getTeamId(),
    metadata: {
      command,
      hasArgs: text.length > 0,
      argsLength: text.length
    }
  });
  
  // Handle different commands
  if (command === '/nuco') {
    return processNucoCommand(body, slack);
  }
  
  // Default response for unhandled commands
  return NextResponse.json({
    response_type: 'ephemeral',
    text: 'Unknown command. Try `/nuco help` for available commands.',
  });
}

/**
 * Handle Slack interactive components
 */
async function handleInteractiveComponent(payload: SlackInteractivePayload): Promise<NextResponse> {
  const { type, actions, user, channel } = payload;
  
  // Handle different types of interactive components
  if (type === 'block_actions' && actions && actions.length > 0) {
    return processBlockActions(actions, user, channel);
  }
  
  // Default response for unhandled interactive components
  return NextResponse.json({ success: true });
}

/**
 * Process a message event
 */
async function processMessage(event: SlackMessageEvent, slack: SlackIntegration): Promise<void> {
  try {
    // Skip messages from bots to prevent loops
    if (event.bot_id || event.subtype) {
      return;
    }
    
    // Create thread manager
    const threadManager = createThreadManager(slack);
    
    // Track the message in thread context
    // If it's a thread reply, use the thread_ts, otherwise use the message ts as the parent
    const threadTs = event.thread_ts || event.ts;
    await threadManager.addMessageToThread(
      event.channel,
      threadTs,
      {
        ts: event.ts,
        user: event.user,
        text: event.text,
        isBot: false
      }
    );
    
    // Track the message received event
    await analyticsService.trackEvent({
      eventType: 'message_received',
      integrationId: slack.getIntegrationId(),
      slackUserId: event.user,
      slackChannelId: event.channel,
      slackTeamId: slack.getTeamId(),
      metadata: {
        messageTs: event.ts,
        threadTs: event.thread_ts,
        isThreaded: !!event.thread_ts,
        messageLength: event.text.length
      }
    });
    
    // Add reactions based on message sentiment
    const messageText = event.text;
    const reactions = await getMessageReactions(messageText, { useAI: false }); // Use simple analysis for performance
    
    // Add up to 2 reactions (to avoid cluttering the message)
    for (let i = 0; i < Math.min(2, reactions.length); i++) {
      try {
        await slack.addReaction(event.channel, event.ts, reactions[i]);
        
        // Track reaction added event
        await analyticsService.trackEvent({
          eventType: 'reaction_added',
          integrationId: slack.getIntegrationId(),
          slackUserId: slack.getBotUserId(),
          slackChannelId: event.channel,
          slackTeamId: slack.getTeamId(),
          metadata: {
            messageTs: event.ts,
            reaction: reactions[i],
            isAuto: true
          }
        });
        
        // Small delay to prevent rate limiting
        if (i < reactions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error adding reaction ${reactions[i]}:`, error);
        // Continue with next reaction even if one fails
      }
    }
    
    // If this is a thread reply, check if we should respond
    if (event.thread_ts) {
      // Get thread history
      const threadHistory = await threadManager.getThreadHistory(event.channel, event.thread_ts);
      
      // Check if the bot has participated in this thread before
      const botParticipated = threadHistory.some(msg => msg.isBot);
      
      if (botParticipated) {
        // The bot has participated in this thread before, so we might want to respond
        // For now, we'll just add a reaction to acknowledge the message
        try {
          await slack.addReaction(event.channel, event.ts, 'eyes');
          
          // Track reaction added event
          await analyticsService.trackEvent({
            eventType: 'reaction_added',
            integrationId: slack.getIntegrationId(),
            slackUserId: slack.getBotUserId(),
            slackChannelId: event.channel,
            slackTeamId: slack.getTeamId(),
            metadata: {
              messageTs: event.ts,
              reaction: 'eyes',
              isAuto: true,
              isThreadReply: true
            }
          });
        } catch (error) {
          console.error('Error adding eyes reaction:', error);
        }
        
        // Store the fact that we've seen this message
        await threadManager.setThreadMetadata(
          event.channel,
          event.thread_ts,
          'lastUserMessageTs',
          event.ts
        );
      }
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
}

/**
 * Process an app mention event
 */
async function processAppMention(event: SlackAppMentionEvent, slack: SlackIntegration): Promise<void> {
  try {
    // Create thread manager
    const threadManager = createThreadManager(slack);
    
    // Track the app mention event
    await analyticsService.trackEvent({
      eventType: 'app_mention',
      integrationId: slack.getIntegrationId(),
      slackUserId: event.user,
      slackChannelId: event.channel,
      slackTeamId: slack.getTeamId(),
      metadata: {
        messageTs: event.ts,
        threadTs: event.thread_ts,
        isThreaded: !!event.thread_ts,
        messageLength: event.text.length
      }
    });
    
    // Add a thinking reaction to show the bot is processing
    await slack.addReaction(event.channel, event.ts, 'thinking_face');
    
    // Track reaction added event
    await analyticsService.trackEvent({
      eventType: 'reaction_added',
      integrationId: slack.getIntegrationId(),
      slackUserId: slack.getBotUserId(),
      slackChannelId: event.channel,
      slackTeamId: slack.getTeamId(),
      metadata: {
        messageTs: event.ts,
        reaction: 'thinking_face',
        isAuto: true
      }
    });
    
    // Track the mention in thread context
    // If it's a thread reply, use the thread_ts, otherwise use the message ts as the parent
    const threadTs = event.thread_ts || event.ts;
    await threadManager.addMessageToThread(
      event.channel,
      threadTs,
      {
        ts: event.ts,
        user: event.user,
        text: event.text,
        isBot: false
      }
    );
    
    // Extract the actual message (remove the bot mention)
    const botMentionRegex = /<@[A-Z0-9]+>/;
    const messageText = event.text.replace(botMentionRegex, '').trim();
    
    // Process the mention and generate a response
    // For now, we'll just acknowledge with a reaction
    // In a real implementation, this would call the AI service
    
    // Remove the thinking reaction
    await slack.removeReaction(event.channel, event.ts, 'thinking_face');
    
    // Track reaction removed event
    await analyticsService.trackEvent({
      eventType: 'reaction_removed',
      integrationId: slack.getIntegrationId(),
      slackUserId: slack.getBotUserId(),
      slackChannelId: event.channel,
      slackTeamId: slack.getTeamId(),
      metadata: {
        messageTs: event.ts,
        reaction: 'thinking_face',
        isAuto: true
      }
    });
    
    // Add appropriate reactions based on message sentiment
    const reactions = await getMessageReactions(messageText, { useAI: true }); // Use AI for mentions
    
    // Add reactions
    for (let i = 0; i < Math.min(2, reactions.length); i++) {
      try {
        await slack.addReaction(event.channel, event.ts, reactions[i]);
        
        // Track reaction added event
        await analyticsService.trackEvent({
          eventType: 'reaction_added',
          integrationId: slack.getIntegrationId(),
          slackUserId: slack.getBotUserId(),
          slackChannelId: event.channel,
          slackTeamId: slack.getTeamId(),
          metadata: {
            messageTs: event.ts,
            reaction: reactions[i],
            isAuto: true
          }
        });
        
        // Small delay to prevent rate limiting
        if (i < reactions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error adding reaction ${reactions[i]}:`, error);
      }
    }
    
    // Record the start time for AI response
    const startTime = Date.now();
    
    // Send a response message
    const response = await slack.sendMessage({
      channel: event.channel,
      text: `I noticed your message! I've added some reactions based on the sentiment.`,
      thread_ts: event.ts,
    });
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Track message sent event
    await analyticsService.trackEvent({
      eventType: 'message_sent',
      integrationId: slack.getIntegrationId(),
      slackUserId: slack.getBotUserId(),
      slackChannelId: event.channel,
      slackTeamId: slack.getTeamId(),
      metadata: {
        messageTs: response.ts as string,
        threadTs: event.ts,
        isThreaded: true,
        messageLength: (response.message as { text: string })?.text?.length || 0
      }
    });
    
    // Track AI performance
    await analyticsService.trackAIPerformance({
      integrationId: slack.getIntegrationId(),
      messageId: response.ts as string,
      slackUserId: event.user,
      slackChannelId: event.channel,
      promptLength: messageText.length,
      responseLength: (response.message as { text: string })?.text?.length || 0,
      responseTime,
      modelUsed: 'sentiment-analysis'
    });
    
    // Track the bot's response in thread context
    if (response && response.ts) {
      await threadManager.addMessageToThread(
        event.channel,
        threadTs,
        {
          ts: response.ts as string,
          user: 'bot', // Use 'bot' as the user ID for bot messages
          text: (response.message as { text: string })?.text || '',
          isBot: true
        }
      );
    }
    
    // Store metadata about this interaction
    await threadManager.setThreadMetadata(
      event.channel,
      threadTs,
      'lastInteraction',
      new Date().toISOString()
    );
  } catch (error) {
    console.error('Error processing app mention:', error);
  }
}

/**
 * Process the /nuco command
 */
async function processNucoCommand(
  body: SlackSlashCommand,
  slack: SlackIntegration
): Promise<NextResponse> {
  const { command, text, user_id, channel_id } = body;
  
  // Parse the command text
  const args = text.trim().split(' ');
  const subcommand = args[0]?.toLowerCase() || 'help';
  const subcommandArgs = args.slice(1).join(' ');
  
  // Track command usage
  await analyticsService.trackEvent({
    eventType: `command_${subcommand}`,
    integrationId: slack.getIntegrationId(),
    slackUserId: user_id,
    slackChannelId: channel_id,
    slackTeamId: slack.getTeamId(),
    metadata: {
      command,
      subcommand,
      hasArgs: subcommandArgs.length > 0,
      argsLength: subcommandArgs.length
    }
  });
  
  // Handle different subcommands
  switch (subcommand) {
    case 'help':
      return NextResponse.json({
        response_type: 'ephemeral',
        text: `*Available Commands*:
• \`/nuco help\` - Show this help message
• \`/nuco chat [message]\` - Chat with the AI
• \`/nuco templates\` - List your prompt templates`,
      });
      
    case 'chat':
      if (!subcommandArgs) {
        return NextResponse.json({
          response_type: 'ephemeral',
          text: 'Please provide a message to chat with the AI. Example: `/nuco chat What is the capital of France?`',
        });
      }
      
      // Make a request to the chat API
      try {
        const chatResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/slack/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: subcommandArgs,
            userId: user_id,
            channelId: channel_id,
          }),
        });
        
        if (!chatResponse.ok) {
          throw new Error('Failed to process chat request');
        }
        
        // Return an immediate response
        return NextResponse.json({
          response_type: 'ephemeral',
          text: 'Processing your request...',
        });
      } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json({
          response_type: 'ephemeral',
          text: 'Sorry, there was an error processing your request.',
        });
      }
      
    case 'templates':
      // Make a request to the templates API
      try {
        const templatesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/slack/slack-templates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user_id,
            channelId: channel_id,
          }),
        });
        
        if (!templatesResponse.ok) {
          throw new Error('Failed to process templates request');
        }
        
        const data = await templatesResponse.json();
        return NextResponse.json(data);
      } catch (error) {
        console.error('Templates error:', error);
        return NextResponse.json({
          response_type: 'ephemeral',
          text: 'Sorry, there was an error retrieving your templates.',
        });
      }
      
    default:
      return NextResponse.json({
        response_type: 'ephemeral',
        text: `Unknown command: \`${subcommand}\`. Try \`/nuco help\` for available commands.`,
      });
  }
}

/**
 * Process block actions from interactive components
 */
async function processBlockActions(
  actions: SlackAction[],
  user: SlackUser,
  channel: SlackChannel
): Promise<NextResponse> {
  // Process the first action
  const action = actions[0];
  
  if (action.action_id === 'use_template') {
    // Handle template selection
    try {
      const templateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/slack/slack-templates/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: action.value,
          userId: user.id,
          channelId: channel.id,
        }),
      });
      
      if (!templateResponse.ok) {
        throw new Error('Failed to process template request');
      }
      
      const data = await templateResponse.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Template use error:', error);
      return NextResponse.json({
        response_type: 'ephemeral',
        text: 'Sorry, there was an error using the template.',
      });
    }
  }
  
  // Default response for unhandled actions
  return NextResponse.json({
    response_type: 'ephemeral',
    text: 'Action not supported.',
  });
} 