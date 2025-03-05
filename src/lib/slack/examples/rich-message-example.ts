/**
 * Rich Message Examples
 * 
 * This file contains examples of how to use the SlackMessageBuilder
 * to create rich messages with blocks and attachments.
 */

import { createMessageBuilder } from '../message-builder';
import { SlackIntegration } from '@/lib/integrations/slack';

/**
 * Example: Welcome Message
 * Creates a welcome message with header, text, and buttons
 */
export function createWelcomeMessage(channelId: string): ReturnType<typeof createMessageBuilder.prototype.build> {
  return createMessageBuilder('Welcome to Nuco AI!')
    .channel(channelId)
    .addHeader('Welcome to Nuco AI!')
    .addSection('Thanks for adding Nuco AI to your Slack workspace. Here are some things you can do:')
    .addDivider()
    .addSection('*Chat with AI*\nUse `/nuco chat [your message]` to start a conversation with our AI.')
    .addSection('*Use Templates*\nAccess your prompt templates with `/nuco templates`.')
    .addSection('*Get Help*\nType `/nuco help` to see all available commands.')
    .addActions([
      {
        text: 'View Documentation',
        actionId: 'view_docs',
        url: 'https://docs.nuco.ai'
      },
      {
        text: 'Settings',
        actionId: 'open_settings',
        value: 'settings'
      }
    ])
    .build();
}

/**
 * Example: AI Response
 * Creates a rich message for AI responses with context
 */
export function createAIResponseMessage(
  channelId: string, 
  threadTs: string, 
  response: string, 
  sources?: { title: string, url: string }[]
): ReturnType<typeof createMessageBuilder.prototype.build> {
  const builder = createMessageBuilder(response)
    .channel(channelId)
    .thread(threadTs)
    .addSection(response);
  
  // Add sources if provided
  if (sources && sources.length > 0) {
    builder.addDivider();
    builder.addSection('*Sources:*');
    
    sources.forEach(source => {
      builder.addSection(`• <${source.url}|${source.title}>`);
    });
  }
  
  // Add feedback buttons
  builder.addActions([
    {
      text: '👍 Helpful',
      actionId: 'feedback_helpful',
      value: 'helpful'
    },
    {
      text: '👎 Not Helpful',
      actionId: 'feedback_not_helpful',
      value: 'not_helpful'
    },
    {
      text: 'Regenerate',
      actionId: 'regenerate_response',
      value: 'regenerate'
    }
  ]);
  
  return builder.build();
}

/**
 * Example: Error Message
 * Creates an error message with a warning style
 */
export function createErrorMessage(
  channelId: string, 
  threadTs: string | undefined, 
  errorMessage: string
): ReturnType<typeof createMessageBuilder.prototype.build> {
  const builder = createMessageBuilder('Error')
    .channel(channelId);
  
  if (threadTs) {
    builder.thread(threadTs);
  }
  
  return builder
    .addSection('⚠️ *Error*')
    .addSection(errorMessage)
    .addActions([
      {
        text: 'Try Again',
        actionId: 'try_again',
        value: 'retry'
      },
      {
        text: 'Report Issue',
        actionId: 'report_issue',
        value: 'report',
        style: 'danger'
      }
    ])
    .addConfirmationDialog(
      'Report Issue',
      'Are you sure you want to report this issue to the Nuco team?',
      'Yes, Report',
      'Cancel',
      'danger'
    )
    .build();
}

/**
 * Example: Template List
 * Creates a message showing available templates
 */
export function createTemplateListMessage(
  channelId: string,
  templates: { id: string, name: string, description: string }[]
): ReturnType<typeof createMessageBuilder.prototype.build> {
  const builder = createMessageBuilder('Your Templates')
    .channel(channelId)
    .addHeader('Your Templates')
    .addSection('Here are your available templates:')
    .addDivider();
  
  if (templates.length === 0) {
    builder.addSection('You don\'t have any templates yet. Create one in the Nuco dashboard.');
  } else {
    templates.forEach(template => {
      builder.addSection(`*${template.name}*\n${template.description}`);
      builder.addActions([
        {
          text: 'Use Template',
          actionId: `use_template_${template.id}`,
          value: template.id
        },
        {
          text: 'Edit',
          actionId: `edit_template_${template.id}`,
          value: template.id
        }
      ]);
      builder.addDivider();
    });
  }
  
  return builder.build();
}

/**
 * Send a rich message using the Slack integration
 */
export async function sendRichMessage(
  slack: SlackIntegration,
  message: ReturnType<typeof createMessageBuilder.prototype.build>
): Promise<Record<string, unknown>> {
  return slack.sendMessage(message);
} 