import { messages } from './../db/schema/messages';
/**
 * AI Service
 * 
 * This file provides a unified interface for interacting with various AI providers.
 * It handles provider selection, message formatting, and response processing.
 */
import { v4 as uuidv4 } from 'uuid';
import { StreamTextResult, ToolSet, streamText, LanguageModelV1, ToolChoice } from 'ai';
import { AIProvider, getModelById } from './config';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getOrganizationSettings } from '@/lib/metadata/service';
import { organizationSettings } from '@/lib/db/schema/organization-settings';
import { AIServiceError } from './error';
import { estimateTokenCount } from './tokenizer';
import { AgentOrchestrator } from './agents/orchestrator';
import { ChainService } from './service/chain-service';
import { ChainConfig, AgentChain } from './agents/chain';
import { Message, CompletionOptions } from './types';
import { AgentContext } from './agents/base';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { AgentFactory } from './agents/factory';

/**
 * Maximum number of retry attempts for rate-limited requests
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Base backoff time in milliseconds
 */
const BASE_BACKOFF_MS = 1000;

/**
 * Check if an organization has exceeded its token limit
 * @param organizationId The organization ID to check
 * @returns True if the organization has exceeded its token limit, false otherwise
 */
export async function hasExceededTokenLimit(organizationId: string): Promise<boolean> {
  try {
    // Get the organization settings
    const settings = await getOrganizationSettings(organizationId);
    
    // If no settings or no AI settings with usage limit, assume not exceeded
    if (!settings || !settings.aiSettings || !settings.aiSettings.usageLimit) {
      return false;
    }
    
    const { usageLimit } = settings.aiSettings;
    
    // If no monthly token limit is set, assume not exceeded
    if (!usageLimit.monthlyTokenLimit) {
      return false;
    }
    
    // Check if the current usage exceeds the monthly limit
    // Use currentMonthUsage if available, otherwise default to 0
    const currentUsage = usageLimit.currentMonthUsage || 0;
    return currentUsage >= usageLimit.monthlyTokenLimit;
  } catch (error) {
    console.error('Error checking token limit:', error);
    // In case of error, default to not exceeded to prevent blocking legitimate requests
    return false;
  }
}

/**
 * Generate a streaming completion from the AI service with retry logic
 * @param messages The messages to send to the API
 * @param options The options for the completion
 * @param retryCount Current retry count (used internally)
 * @returns A streaming response from the API
 */
export async function generateCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: CompletionOptions = {},
  retryCount = 0
): Promise<StreamTextResult<ToolSet, never>> {
  try {
    // Get the model configuration
    const modelId = options.modelId || 'gpt-4';
    const modelConfig = getModelById(modelId);
    
    if (!modelConfig) {
      throw new AIServiceError(`Model ${modelId} not found`, 'custom', 'invalid_model');
    }
    
    // Check token limits
    if (options.organizationId && !options.useCustomTokens) {
      const hasExceeded = await hasExceededTokenLimit(options.organizationId);
      if (hasExceeded) {
        throw new AIServiceError(
          'Token limit exceeded',
          modelConfig.provider,
          'token_limit_exceeded'
        );
      }
    }

    // Create agent factory instance
    const agentFactory = AgentFactory.getInstance({
      defaultModelId: modelId,
      defaultSystemPrompt: options.systemPrompt || '',
      metadata: {
        organizationId: options.organizationId,
      },
    });

    // Create a default agent
    const agent = await agentFactory.createAgent('default', {
      modelConfig: {
        id: modelId,
        name: modelConfig.name || 'Default Model',
        provider: modelConfig.provider,
        contextWindow: modelConfig.contextWindow || 4096,
        maxOutputTokens: options.maxTokens || modelConfig.maxOutputTokens || 2048,
        temperature: options.temperature || modelConfig.temperature || 0.7,
        topP: options.topP || modelConfig.topP || 1,
        frequencyPenalty: options.frequencyPenalty || modelConfig.frequencyPenalty || 0,
        presencePenalty: options.presencePenalty || modelConfig.presencePenalty || 0,
        costPer1kInput: modelConfig.costPer1kInput || 0.01,
        costPer1kOutput: modelConfig.costPer1kOutput || 0.03,
      },
    });

    // Create agent context
    const context: AgentContext = {
      messages: messages.map(msg => ({
        id: uuidv4(),
        role: msg.role,
        content: msg.content,
        createdAt: new Date(),
      })),
      state: {
        id: uuidv4(),
        status: 'running',
        lastUpdated: new Date(),
        metadata: {},
      },
      config: {
        id: uuidv4(),
        name: 'default',
        description: 'Default agent for handling completions',
        model: modelId,
      },
      metadata: {
        organizationId: options.organizationId,
        useCustomTokens: options.useCustomTokens,
        customTokens: options.customTokens,
        systemPrompt: options.systemPrompt,
        functions: options.functions,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
        },
      },
      executionId: uuidv4(),
    };

    // Execute the agent
    const result = await agent.execute(context);

    // Track token usage
    if (options.organizationId && !options.useCustomTokens && result.metadata?.tokenUsage) {
      const tokenUsage = result.metadata.tokenUsage as { promptTokens?: number; completionTokens?: number };
      const totalTokens = (tokenUsage.promptTokens || 0) + (tokenUsage.completionTokens || 0);
      updateTokenUsage(options.organizationId, totalTokens).catch(console.error);
    }

    // Create provider client
    const provider = modelId.startsWith('gpt') ? 'openai' : 'anthropic';
    const client = provider === 'openai' 
      ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Create final serializable messages for streaming
    const serializableMessages = messages.map(msg => ({
      role: msg.role,
      content: typeof result.output === 'string' ? result.output : JSON.stringify(result.output)
    }));

    return streamText({
      model: client(modelId),
      messages: serializableMessages,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      topP: options.topP || 1
    });

  } catch (error) {
    console.error('Error in generateCompletion:', error);
    
    if (error instanceof AIServiceError) {
      if (error.code === 'rate_limit_exceeded' && retryCount < MAX_RETRY_ATTEMPTS) {
        const delay = error.retryAfter ? error.retryAfter * 1000 : calculateExponentialBackoff(retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateCompletion(messages, options, retryCount + 1);
      }
      throw error;
    }
    
    throw new AIServiceError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      'unknown',
      error instanceof Error && 'status' in error ? (error as any).status : undefined,
    );
  }
}

/**
 * Calculate exponential backoff time
 * @param retryCount Current retry attempt
 * @returns Backoff time in milliseconds
 */
function calculateExponentialBackoff(retryCount: number): number {
  // 2^retryCount * BASE_BACKOFF_MS with some jitter
  const jitter = Math.random() * 0.3 + 0.85; // Random value between 0.85 and 1.15
  return Math.min(
    Math.pow(2, retryCount) * BASE_BACKOFF_MS * jitter,
    60000 // Cap at 60 seconds
  );
}

/**
 * Count the number of tokens in a string
 * @param text The text to count tokens for
 * @param provider The provider to use for counting
 * @returns The number of tokens in the text
 */
export async function countTokens(text: string, provider: AIProvider = 'openai'): Promise<number> {
  return estimateTokenCount(text, provider);
}

/**
 * Generate embeddings for a text
 * @param text The text to generate embeddings for
 * @param provider The provider to use for generating embeddings
 * @returns The embeddings for the text
 */
export async function generateEmbeddings(text: string, provider: AIProvider = 'openai'): Promise<number[]> {
  switch (provider) {
    case 'openai':
      // TODO: Implement OpenAI embeddings
      throw new Error('OpenAI embeddings not implemented yet');
    case 'anthropic':
      // TODO: Implement Anthropic embeddings
      throw new Error('Anthropic embeddings not implemented yet');
    case 'google':
      // TODO: Implement Google embeddings
      throw new Error('Google embeddings not implemented yet');
    case 'custom':
      // TODO: Implement custom embeddings
      throw new Error('Custom embeddings not implemented yet');
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Update token usage for an organization
 * @param organizationId The organization ID to update
 * @param tokenCount The number of tokens to add to the usage
 * @returns True if the update was successful, false otherwise
 */
export async function updateTokenUsage(organizationId: string, tokenCount: number): Promise<boolean> {
  try {
    // Get the organization settings
    const settings = await getOrganizationSettings(organizationId);
    
    // If no settings or no AI settings, create them
    if (!settings || !settings.aiSettings) {
      return false;
    }
    
    // Get the current AI settings
    const aiSettings = settings.aiSettings;
    
    // Create or update the usage limit
    const usageLimit = aiSettings.usageLimit || {
      monthlyTokenLimit: 1000000, // Default to 1M tokens
      currentMonthUsage: 0,
      resetDate: new Date().toISOString(),
    };
    
    // Update the current month usage
    const currentUsage = usageLimit.currentMonthUsage || 0;
    const newUsage = currentUsage + tokenCount;
    
    // Update the settings
    await db.update(organizationSettings)
      .set({
        aiSettings: {
          ...aiSettings,
          usageLimit: {
            ...usageLimit,
            currentMonthUsage: newUsage,
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(organizationSettings.organizationId, organizationId));
    
    return true;
  } catch (error) {
    console.error('Error updating token usage:', error);
    return false;
  }
}

export class AIService {
  private orchestrator: AgentOrchestrator;
  private chainService: ChainService;

  constructor() {
    this.orchestrator = new AgentOrchestrator({
      maxConcurrentAgents: 10,
      resourceLimits: {
        memory: 1024,
        cpu: 8,
        network: 100
      },
      retryConfig: {
        maxAttempts: 3,
        backoffMs: 1000
      },
      monitoring: {
        enabled: true,
        metricsInterval: 60000
      }
    });

    this.chainService = new ChainService(this.orchestrator);
  }

  async initialize(context: { organizationId?: string; modelId?: string } = {}): Promise<void> {
    // Initialize orchestrator and chain service
    await this.orchestrator.initialize();
    await this.chainService.initialize();

    // Get organization settings if organizationId is provided
    let modelId = context.modelId;
    if (!modelId && context.organizationId) {
      const settings = await getOrganizationSettings(context.organizationId);
      modelId = settings?.aiSettings?.defaultModel;
    }
    modelId = modelId || 'gpt-3.5-turbo'; // Fallback to a default model

    // Get the agent factory instance
    const agentFactory = AgentFactory.getInstance({
      defaultModelId: modelId,
      defaultSystemPrompt: '',
      metadata: {
        organizationId: context.organizationId
      }
    }, this);

    // Define default configurations for each agent type
    const defaultConfigs = {
      'analysis': {
        analysis: {
          textAnalysis: {
            enabled: true,
            maxTokens: 2048,
            temperature: 0.7,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0
          },
          dataAnalysis: {
            enabled: true,
            maxSampleSize: 1000,
            confidenceLevel: 0.95
          },
          sentimentAnalysis: {
            enabled: true,
            includeNeutral: true
          }
        }
      },
      'data-gathering': {
        sources: {
          web: { enabled: true },
          api: { enabled: true },
          database: { enabled: true }
        },
        validation: {
          enabled: true,
          schema: true,
          format: true
        }
      },
      'dashboard': {
        visualization: {
          enabled: true,
          types: ['line', 'bar', 'pie', 'scatter'],
          interactive: true
        },
        refresh: {
          enabled: true,
          interval: 300
        }
      },
      'web-research': {
        search: {
          enabled: true,
          maxResults: 10,
          timeout: 30000
        },
        extraction: {
          enabled: true,
          maxContentLength: 100000
        }
      },
      'accuracy-auditor': {
        audit: {
          enabled: true,
          metrics: ['accuracy', 'precision', 'recall', 'f1'],
          sampleSize: 100
        }
      },
      'completeness-auditor': {
        audit: {
          enabled: true,
          metrics: ['coverage', 'completeness', 'consistency'],
          threshold: 0.95
        }
      }
    };

    // Register all available agent types
    const agentTypes = {
      'default': () => import('./agents/default').then(m => m.DefaultAgent),
      'data-gathering': () => import('./agents/data-gathering').then(m => m.DataGatheringAgent),
      'analysis': () => import('./agents/analysis/agent').then(m => m.AnalysisAgent),
      'dashboard': () => import('./agents/dashboard/base').then(m => m.DashboardReportingAgent),
      'web-research': () => import('./agents/research/web').then(m => m.WebResearchAgent),
      'accuracy-auditor': () => import('./agents/audit/accuracy').then(m => m.AccuracyAuditor),
      'completeness-auditor': () => import('./agents/audit/completeness').then(m => m.CompletenessAuditor)
    };

    // Register agent types dynamically
    for (const [id, importFn] of Object.entries(agentTypes)) {
      const AgentClass = await importFn();
      agentFactory.registerAgentType(id, AgentClass);
    }

    // Create and register default instances of each agent type
    const agents = await Promise.all(Object.keys(agentTypes).map(async id => {
      // Merge base config with type-specific default config
      const config = {
        id: `${id}-default`,
        name: `${id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Agent`,
        description: `Default instance of ${id} agent`,
        model: modelId,
        ...defaultConfigs[id as keyof typeof defaultConfigs]
      };

      return agentFactory.createAgent(id, config);
    }));

    // Register each agent with the orchestrator
    for (const agent of agents) {
      const state = agent.getState();
      // Store only minimal metadata in the database
      const minimalConfig = {
        id: state.id,
        name: state.id,
        description: `Default instance of ${agent.constructor.name}`,
        model: modelId,
        type: agent.constructor.name.toLowerCase().replace(/agent|auditor|reporting/g, '').trim()
      };

      await this.orchestrator.registerAgent(agent, {
        ...minimalConfig,
        aiService: this
      });
    }
  }

  // Chain Operations
  async createChain(config: ChainConfig): Promise<AgentChain> {
    return this.chainService.createChain(config);
  }

  async getChain(id: string): Promise<AgentChain> {
    return this.chainService.getChain(id);
  }

  async listChains(): Promise<ChainConfig[]> {
    return this.chainService.listChains();
  }

  async deleteChain(id: string): Promise<void> {
    return this.chainService.deleteChain(id);
  }

  async executeChain(id: string, context: any): Promise<any[]> {
    return this.chainService.executeChain(id, context);
  }

  // Direct Agent Operations (for backward compatibility)
  async generateCompletion(
    messages: Message[],
    options: CompletionOptions
  ): Promise<StreamTextResult<ToolSet, never>> {
    try {
      console.log('Starting generateCompletion with options:', {
        modelId: options.modelId,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        topP: options.topP,
        metadata: options.metadata
      });

      const executionIdFallback = uuidv4();
      const modelId = options.modelId || 'gpt-4';
      const provider = modelId.startsWith('gpt') ? 'openai' : 'anthropic';

      console.log('Using model configuration:', { modelId, provider });

      // Get model configuration
      const modelConfig = getModelById(modelId);
      if (!modelConfig) {
        console.error('Model configuration not found:', { modelId, provider });
        throw new AIServiceError(`Model ${modelId} not found`, provider, 'invalid_model');
      }

      console.log('Model configuration retrieved:', {
        name: modelConfig.name,
        contextWindow: modelConfig.contextWindow,
        maxOutputTokens: modelConfig.maxOutputTokens,
        provider: modelConfig.provider
      });

      // Create a complete model configuration for the context
      const completeModelConfig = {
        ...modelConfig,
        timeout: modelConfig.maxOutputTokens ? 
          Math.ceil(modelConfig.maxOutputTokens / 100) * 1000 : // Rough estimate: 1s per 100 tokens
          60000, // Default 60s timeout
        temperature: options.temperature || modelConfig.temperature || 0.7,
        maxTokens: options.maxTokens || modelConfig.maxOutputTokens || 1000,
        topP: options.topP || modelConfig.topP || 1
      };

      const context: AgentContext = {
        messages,
        metadata: {
          ...options.metadata,
          provider,
          modelConfig: completeModelConfig // Add model config to metadata
        },
        executionId: options.executionId || executionIdFallback,
        attempt: options.attempt,
        state: {
          id: uuidv4(),
          status: 'idle',
          lastUpdated: new Date(),
          metadata: {}
        },
        config: {
          id: 'default',
          name: 'Default Agent',
          description: 'Default agent for handling general queries',
          model: modelId,
          modelConfig: completeModelConfig,
          metadata: {
            ...options.metadata,
            provider,
            modelConfig: completeModelConfig // Add model config to config metadata
          }
        }
      };

      console.log('Created agent context:', {
        executionId: context.executionId,
        model: context.config.model,
        messageCount: context.messages.length,
        modelConfig: context.config.modelConfig
      });

      // Execute agent
      console.log('Executing task with orchestrator...');
      const result = await this.orchestrator.executeTask(context);
      console.log('Orchestrator task completed:', {
        success: result.success,
        hasOutput: !!result.output,
        metadata: result.metadata
      });
      
      // Check if we need to fall back to direct LLM completion
      if (result.metadata?.fallbackToDirectLLM) {
        console.log('Falling back to direct LLM completion');
        // Create provider client based on model ID
        const client = provider === 'openai' 
          ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
          : createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        console.log('Created provider client:', { provider });

        // Use the model configuration from the context
        const streamConfig = {
          model: client(modelId),
          messages: context.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature: completeModelConfig.temperature,
          maxTokens: completeModelConfig.maxTokens,
          topP: completeModelConfig.topP
        };

        console.log('Streaming with configuration:', {
          model: modelId,
          messageCount: streamConfig.messages.length,
          temperature: streamConfig.temperature,
          maxTokens: streamConfig.maxTokens,
          topP: streamConfig.topP
        });

        return streamText(streamConfig);
      }
      
      // Create provider client based on model ID
      console.log('Creating provider client for direct streaming');
      const client = provider === 'openai' 
        ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
        : createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      // Create final serializable messages for streaming
      const serializableMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const streamConfig = {
        model: client(modelId),
        messages: serializableMessages,
        temperature: completeModelConfig.temperature,
        maxTokens: completeModelConfig.maxTokens,
        topP: completeModelConfig.topP
      };

      console.log('Streaming with configuration:', {
        model: modelId,
        messageCount: streamConfig.messages.length,
        temperature: streamConfig.temperature,
        maxTokens: streamConfig.maxTokens,
        topP: streamConfig.topP
      });

      return streamText(streamConfig);

    } catch (error) {
      console.error('Error in AIService.generateCompletion:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        options: {
          modelId: options.modelId,
          provider: options.modelId?.startsWith('gpt') ? 'openai' : 'anthropic'
        }
      });
      
      // If it's already an AIServiceError, rethrow it
      if (error instanceof AIServiceError) {
        console.log('Rethrowing existing AIServiceError');
        throw error;
      }

      // For other errors, create a new AIServiceError with proper context
      const modelId = options.modelId || 'gpt-4';
      const modelConfig = getModelById(modelId);
      const provider = modelConfig?.provider || (modelId.startsWith('gpt') ? 'openai' : 'anthropic');
      
      console.log('Creating new AIServiceError with context:', {
        modelId,
        provider,
        modelConfig: modelConfig ? {
          name: modelConfig.name,
          provider: modelConfig.provider
        } : null
      });
      
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        provider,
        'unknown',
        error instanceof Error && 'status' in error ? (error as any).status : undefined,
        provider
      );
    }
  }

  // Metrics and Monitoring
  getChainMetrics() {
    return this.chainService.getMetrics();
  }

  // Cleanup
  async cleanup(): Promise<void> {
    await this.chainService.cleanup();
  }
}

// Export singleton instance
export const aiService = new AIService();

// Export types
export type { Message, CompletionOptions, StreamTextResult, ToolSet, ChainConfig, AgentChain }; 