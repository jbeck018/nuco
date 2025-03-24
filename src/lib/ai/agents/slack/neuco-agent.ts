import { IAgent, AgentConfig, AgentState, AgentContext, AgentResult } from '../base';
import { Message, generateCompletion } from '../../service';
import { listUserPromptTemplates, getPromptTemplate } from '../../templates';

/**
 * NeucoAgent
 * 
 * This agent handles the /neuco command in Slack, providing various AI-powered features.
 */
export class NeucoAgent implements IAgent {
  private state: AgentState;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.state = {
      id: crypto.randomUUID(),
      status: 'idle',
      lastUpdated: new Date(),
      metadata: {},
    };
  }

  async initialize(config: AgentConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.updateState({ status: 'idle' });
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      await this.updateState({ status: 'running' });

      const command = context.metadata.command as string;
      const args = context.metadata.args as string[];
      const userId = context.metadata.userId as string;

      // Handle different subcommands
      switch (command) {
        case 'help':
          return {
            success: true,
            output: {
              text: 'Available commands:\n' +
                '• /neuco help - Show this help message\n' +
                '• /neuco chat <message> - Chat with the AI\n' +
                '• /neuco templates - List your templates\n' +
                '• /neuco template <id> - Use a specific template\n' +
                '• /neuco template <id> <args...> - Use a template with arguments',
            },
            metadata: {},
          };

        case 'chat':
          if (!args || args.length === 0) {
            return {
              success: false,
              output: null,
              error: new Error('Please provide a message to chat about'),
              metadata: {},
            };
          }

          const response = await this.generateCompletion([
            {
              id: crypto.randomUUID(),
              role: 'user',
              content: args.join(' '),
              createdAt: new Date(),
            },
          ]);

          return {
            success: true,
            output: {
              text: response,
            },
            metadata: {},
          };

        case 'templates':
          const templates = await listUserPromptTemplates(userId);
          if (templates.length === 0) {
            return {
              success: true,
              output: {
                text: 'You have no templates yet. Create one at https://neuco.ai/chat-templates',
              },
              metadata: {},
            };
          }

          const templateList = templates.map(t => 
            `• ${t.name} (${t.id})\n  ${t.description || 'No description'}\n  Tags: ${t.tags.join(', ') || 'None'}`
          ).join('\n\n');

          return {
            success: true,
            output: {
              text: 'Your templates:\n\n' + templateList,
            },
            metadata: {},
          };

        case 'template':
          if (!args || args.length === 0) {
            return {
              success: false,
              output: null,
              error: new Error('Please provide a template ID'),
              metadata: {},
            };
          }

          const templateId = args[0];
          const template = await getPromptTemplate(templateId);
          
          if (!template) {
            return {
              success: false,
              output: null,
              error: new Error('Template not found'),
              metadata: {},
            };
          }

          // Check if template belongs to user or is public
          if (template.userId !== userId && !template.isPublic) {
            return {
              success: false,
              output: null,
              error: new Error('You do not have access to this template'),
              metadata: {},
            };
          }

          // Get template variables and their values from args
          const variables: Record<string, string> = {};
          const templateArgs = args.slice(1);
          template.variables.forEach((variable, index) => {
            if (templateArgs[index]) {
              variables[variable.name] = templateArgs[index];
            } else if (variable.defaultValue) {
              variables[variable.name] = variable.defaultValue;
            }
          });

          // Replace variables in template content
          let content = template.content;
          Object.entries(variables).forEach(([key, value]) => {
            content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
          });

          // Generate completion using the template
          const templateResponse = await this.generateCompletion([
            {
              id: crypto.randomUUID(),
              role: 'user',
              content,
              createdAt: new Date(),
            },
          ]);

          return {
            success: true,
            output: {
              text: templateResponse,
            },
            metadata: {},
          };

        default:
          return {
            success: false,
            output: null,
            error: new Error(`Unknown command: ${command}`),
            metadata: {},
          };
      }
    } catch (error) {
      await this.handleError(error as Error);
      return {
        success: false,
        output: null,
        error: error as Error,
        metadata: {},
      };
    } finally {
      await this.updateState({ status: 'completed' });
    }
  }

  async cleanup(): Promise<void> {
    await this.updateState({ status: 'idle' });
  }

  getState(): AgentState {
    return { ...this.state };
  }

  async updateState(updates: Partial<AgentState>): Promise<void> {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdated: new Date(),
    };
  }

  async handleError(error: Error): Promise<void> {
    console.error(`NeucoAgent error: ${error.message}`, {
      name: error.name,
      stack: error.stack,
    });
    await this.updateState({
      status: 'failed',
      metadata: {
        ...this.state.metadata,
        lastError: error.message,
        errorStack: error.stack,
      },
    });
  }

  async generateCompletion(messages: Message[]): Promise<unknown> {
    return generateCompletion(messages, {
      modelId: this.config.model,
      systemPrompt: this.config.systemPrompt,
    });
  }
} 