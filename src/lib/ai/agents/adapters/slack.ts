import { IAgent, AgentContext, AgentResult, AgentConfig, AgentState } from '../base';
import { SlackIntegration } from '@/lib/integrations/slack';
import { createSlackAnalyticsService } from '@/lib/slack/analytics-service';
import { createThreadManager } from '@/lib/slack/thread-manager';
import { z } from 'zod';
import { AIService } from '../../service';

// Define Slack-specific context schema
export const slackContextSchema = z.object({
  channelId: z.string(),
  threadTs: z.string().optional(),
  userId: z.string(),
  teamId: z.string(),
  message: z.string(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type SlackContext = z.infer<typeof slackContextSchema>;

/**
 * Slack Agent Adapter
 * 
 * This adapter bridges the agent system with Slack, handling message processing,
 * command routing, and response formatting.
 */
export class SlackAgentAdapter {
  private slack: SlackIntegration;
  private analytics: ReturnType<typeof createSlackAnalyticsService>;
  private threadManager: ReturnType<typeof createThreadManager>;
  private agents: Map<string, IAgent> = new Map();
  private aiService: AIService;

  constructor(slack: SlackIntegration) {
    this.slack = slack;
    this.analytics = createSlackAnalyticsService();
    this.threadManager = createThreadManager(slack);
    this.aiService = new AIService();
  }

  /**
   * Register an agent for handling specific commands
   */
  registerAgent(command: string, agent: IAgent): void {
    this.agents.set(command, agent);
  }

  /**
   * Handle an incoming Slack message
   */
  async handleMessage(context: SlackContext): Promise<void> {
    try {
      // Track the event
      await this.analytics.trackEvent({
        eventType: 'message_received',
        integrationId: this.slack.getIntegrationId(),
        userId: context.userId,
        slackUserId: context.userId,
        slackChannelId: context.channelId,
        slackTeamId: context.teamId,
        metadata: {
          command: context.command,
          args: context.args,
        },
      });

      // If it's a command, handle it
      if (context.command) {
        await this.handleCommand(context);
      } else {
        // Otherwise, process as a regular message
        await this.handleRegularMessage(context);
      }
    } catch (error) {
      console.error('Error handling Slack message:', error);
      await this.sendErrorResponse(context, error);
    }
  }

  /**
   * Handle a command message
   */
  private async handleCommand(context: SlackContext): Promise<void> {
    const agent = this.agents.get(context.command!);
    if (!agent) {
      await this.sendErrorResponse(context, new Error(`Unknown command: ${context.command}`));
      return;
    }

    // Create agent context
    const agentContext: AgentContext = {
      messages: [{
        id: crypto.randomUUID(),
        role: 'user',
        content: context.message,
        createdAt: new Date(),
      }],
      state: {
        id: crypto.randomUUID(),
        status: 'running',
        lastUpdated: new Date(),
        metadata: {
          command: context.command,
          args: context.args,
        },
      },
      config: {
        id: context.command || 'default',
        name: context.command || 'default',
        description: `Slack command handler for ${context.command || 'default'}`,
        model: 'gpt-4',
        aiService: this.aiService,
      },
      metadata: {
        command: context.command,
        args: context.args,
        ...context.metadata,
      },
      executionId: crypto.randomUUID(),
    };

    // Execute the agent
    const result = await agent.execute(agentContext);

    // Send the response
    await this.sendResponse(context, result);
  }

  /**
   * Handle a regular message
   */
  private async handleRegularMessage(context: SlackContext): Promise<void> {
    // For now, we'll just echo the message
    // This can be extended to use a default agent or AI service
    await this.sendResponse(context, {
      success: true,
      output: `Received: ${context.message}`,
      metadata: {},
    });
  }

  /**
   * Send a response to Slack
   */
  private async sendResponse(context: SlackContext, result: AgentResult): Promise<void> {
    const message = this.formatResponse(result);
    
    await this.slack.sendMessage({
      channel: context.channelId,
      text: message,
      thread_ts: context.threadTs,
    });

    // Track the response
    await this.analytics.trackEvent({
      eventType: 'message_sent',
      integrationId: this.slack.getIntegrationId(),
      userId: context.userId,
      slackUserId: context.userId,
      slackChannelId: context.channelId,
      slackTeamId: context.teamId,
      metadata: {
        success: result.success,
        error: result.error,
      },
    });
  }

  /**
   * Send an error response
   */
  private async sendErrorResponse(context: SlackContext, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    await this.slack.sendMessage({
      channel: context.channelId,
      text: `❌ Error: ${errorMessage}`,
      thread_ts: context.threadTs,
    });

    // Track the error
    await this.analytics.trackEvent({
      eventType: 'error',
      integrationId: this.slack.getIntegrationId(),
      userId: context.userId,
      slackUserId: context.userId,
      slackChannelId: context.channelId,
      slackTeamId: context.teamId,
      metadata: {
        error: errorMessage,
      },
    });
  }

  /**
   * Format an agent result for Slack
   */
  private formatResponse(result: AgentResult): string {
    if (!result.success) {
      return `❌ Error: ${result.error?.message || 'An unknown error occurred'}`;
    }

    if (typeof result.output === 'string') {
      return result.output;
    }

    if (result.output && typeof result.output === 'object' && 'message' in result.output) {
      return (result.output as { message: string }).message;
    }

    return JSON.stringify(result.output, null, 2);
  }
}

/**
 * Create a Slack agent adapter
 */
export function createSlackAgentAdapter(slack: SlackIntegration): SlackAgentAdapter {
  return new SlackAgentAdapter(slack);
} 