/**
 * AI Service
 * 
 * This file provides a unified interface for interacting with various AI providers.
 * It handles provider selection, message formatting, and response processing.
 */
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
import crypto from 'crypto';
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
  // Get the model configuration
  const modelId = options.modelId || 'gpt-4'; // Provide default model ID
  const modelConfig = getModelById(modelId);
  
  if (!modelConfig) {
    throw new AIServiceError(`Model ${modelId} not found`, 'custom', 'invalid_model');
  }
  
  // Check token limits if organization ID is available and not using custom tokens
  if (options.organizationId && !options.useCustomTokens) {
    const hasExceeded = await hasExceededTokenLimit(options.organizationId);
    
    if (hasExceeded) {
      throw new AIServiceError(
        'Token limit exceeded. Your organization has reached its monthly token usage limit. Please purchase more tokens or add a custom API key.',
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

  // Convert messages to the correct type
  const formattedMessages = messages.map(msg => ({
    id: crypto.randomUUID(),
    role: msg.role,
    content: msg.content,
    createdAt: new Date(),
  }));

  // Create agent context
  const context: AgentContext = {
    messages: formattedMessages,
    state: {
      id: crypto.randomUUID(),
      status: 'running',
      lastUpdated: new Date(),
      metadata: {},
    },
    config: {
      id: crypto.randomUUID(),
      name: 'default',
      description: 'Default agent for handling completions',
      model: modelId,
      aiService: new AIService(),
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
    executionId: crypto.randomUUID(),
  };

  try {
    // Execute the agent
    const result = await agent.execute(context);

    // Track token usage if organization ID is provided and not using custom tokens
    if (options.organizationId && !options.useCustomTokens && result.metadata?.tokenUsage) {
      const tokenUsage = result.metadata.tokenUsage as { promptTokens?: number; completionTokens?: number };
      const totalTokens = (tokenUsage.promptTokens || 0) + (tokenUsage.completionTokens || 0);
      
      // Update token usage in the background
      updateTokenUsage(options.organizationId, totalTokens)
        .catch(error => console.error('Error updating token usage:', error));
    }

    // Create the appropriate provider client based on the model ID
    const provider = modelId.startsWith('gpt') ? 'openai' : 'anthropic';
    const client = provider === 'openai' 
      ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Return streaming response with proper configuration
    return streamText({
      model: client(modelId),
      messages: formattedMessages.map(msg => ({
        role: msg.role,
        content: typeof result.output === 'string' ? result.output : JSON.stringify(result.output),
      })),
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      topP: options.topP || 1,
    });

  } catch (error) {
    // Handle provider-specific errors
    if (error instanceof AIServiceError) {
      // Handle rate limit errors with retry logic
      if (error.code === 'rate_limit_exceeded' && retryCount < MAX_RETRY_ATTEMPTS) {
        const delay = error.retryAfter
          ? error.retryAfter * 1000 // Convert seconds to milliseconds
          : calculateExponentialBackoff(retryCount);
          
        console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
        
        // Wait for the specified delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return generateCompletion(messages, options, retryCount + 1);
      }
      
      throw error;
    } else if (error instanceof Error) {
      throw new AIServiceError(error.message, modelConfig.provider, 'unknown');
    } else {
      throw new AIServiceError('Unknown error', modelConfig.provider, 'unknown');
    }
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
        memory: 1024, // 1GB
        cpu: 8,
        network: 100 // 100MB/s
      },
      retryConfig: {
        maxAttempts: 3,
        backoffMs: 1000
      },
      monitoring: {
        enabled: true,
        metricsInterval: 60000 // 1 minute
      }
    });

    this.chainService = new ChainService(this.orchestrator);
  }

  async initialize(): Promise<void> {
    await this.orchestrator.initialize();
    await this.chainService.initialize();
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
    const context: AgentContext = {
      messages,
      metadata: options.metadata || {},
      executionId: options.executionId || crypto.randomUUID(),
      attempt: options.attempt,
      state: {
        id: crypto.randomUUID(),
        status: 'idle',
        lastUpdated: new Date(),
        metadata: {}
      },
      config: {
        id: 'default',
        name: 'Default Agent',
        description: 'Default agent for handling general queries',
        model: options.modelId || 'gpt-4',
        aiService: this,
        metadata: options.metadata || {}
      }
    };

    const result = await this.orchestrator.executeAgent('default', context);
    
    // Create the appropriate provider client based on the model ID
    const modelId = options.modelId || 'gpt-4';
    const provider = modelId.startsWith('gpt') ? 'openai' : 'anthropic';
    const client = provider === 'openai' 
      ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    return streamText({
      model: client(modelId),
      messages,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      topP: options.topP || 1
    });
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