import { BaseAgent, AgentConfig, AgentContext, AgentResult } from './base';
import { AIService } from '../service';

export class DefaultAgent extends BaseAgent {
  constructor(aiService: AIService) {
    const config: AgentConfig = {
      id: 'default-agent',
      name: 'Default Agent',
      description: 'Default agent for handling general queries',
      model: '', // Model will be set from context
      aiService
    };
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      if (!context.config.model) {
        throw new Error('Model ID is required in context');
      }
      
      this.config.model = context.config.model;
      
      const result = await this.generateCompletion(context.messages, {
        modelId: context.config.model,
        temperature: typeof context.metadata.temperature === 'number' ? context.metadata.temperature : undefined,
        maxTokens: typeof context.metadata.maxTokens === 'number' ? context.metadata.maxTokens : undefined,
        topP: typeof context.metadata.topP === 'number' ? context.metadata.topP : undefined,
        frequencyPenalty: typeof context.metadata.frequencyPenalty === 'number' ? context.metadata.frequencyPenalty : undefined,
        presencePenalty: typeof context.metadata.presencePenalty === 'number' ? context.metadata.presencePenalty : undefined,
        metadata: context.metadata
      });
      
      return {
        success: true,
        output: result,
        metadata: {
          ...context.metadata,
          completionTimestamp: new Date().toISOString(),
          model: context.config.model
        }
      };
    } catch (error) {
      await this.handleError(error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          ...context.metadata,
          model: context.config.model
        }
      };
    }
  }

  async getCapabilities(): Promise<{
    requiresStorage?: boolean;
    maxConcurrentExecutions?: number;
    timeout?: number;
    retryable?: boolean;
    edgeCompatible?: boolean;
  }> {
    return {
      requiresStorage: false,
      maxConcurrentExecutions: 10,
      timeout: 30000,
      retryable: true,
      edgeCompatible: true
    };
  }
} 