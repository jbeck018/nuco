/**
 * AI Service
 * 
 * This file provides a unified interface for interacting with various AI providers.
 * It handles provider selection, message formatting, and response processing.
 */
import { StreamTextResult, ToolSet } from 'ai';
import { AIProvider, ModelConfig, getModelById } from './config';
import { generateOpenAIStream, OpenAIFunction, OpenAIError, OpenAIErrorType } from './providers/openai';
import { generateClaudeStream } from './providers/claude';
import { db } from '@/lib/db';
import { sql, eq, and, gte, lte } from 'drizzle-orm';
import { getOrganizationSettings } from '@/lib/metadata/service';
import { organizationSettings } from '@/lib/db/schema/organization-settings';
import { AIServiceError } from './error';
import { formatMessages } from './utils';
import { estimateTokenCount } from './tokenizer';

/**
 * Message type for AI conversations
 */
export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

/**
 * AI completion options
 */
export interface CompletionOptions {
  modelId?: string;
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  maxTokens?: number;
  functions?: OpenAIFunction[];
  organizationId?: string;
  userId?: string;
  customTokens?: {
    openai?: string;
    anthropic?: string;
    google?: string;
    custom?: string;
  };
  useCustomTokens?: boolean;
}

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
  const modelId = options.modelId;
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
  
  // Apply custom options to the model configuration
  const customizedConfig: ModelConfig = {
    ...modelConfig,
    temperature: options.temperature ?? modelConfig.temperature,
    topP: options.topP ?? modelConfig.topP,
    frequencyPenalty: options.frequencyPenalty ?? modelConfig.frequencyPenalty,
    presencePenalty: options.presencePenalty ?? modelConfig.presencePenalty,
    maxOutputTokens: options.maxTokens ?? modelConfig.maxOutputTokens,
  };
  
  // Format messages for the API
  const formattedMessages = formatMessages(messages, options.systemPrompt);
  
  // Estimate input tokens
  const estimatedInputTokens = await estimateTokenCount(
    formattedMessages.map(m => m.content).join(' '), 
    modelConfig.provider
  );
  
  try {
    // Check if custom tokens should be used
    const providerApiKey = options.useCustomTokens && options.customTokens 
      ? options.customTokens[modelConfig.provider] 
      : undefined;
    
    // Generate the completion based on the provider
    let result: StreamTextResult<ToolSet, never>;
    
    switch (modelConfig.provider) {
      case 'openai':
        result = await generateOpenAIStream(
          formattedMessages, 
          customizedConfig, 
          options.functions,
          providerApiKey
        );
        break;
      case 'anthropic':
        result = await generateClaudeStream(
          formattedMessages, 
          customizedConfig,
          providerApiKey
        );
        break;
      case 'google':
        // TODO: Implement Google provider
        throw new AIServiceError('Google provider not implemented yet', 'google', 'not_implemented');
      case 'custom':
        // TODO: Implement custom provider
        throw new AIServiceError('Custom provider not implemented yet', 'custom', 'not_implemented');
      default:
        throw new AIServiceError(`Unsupported provider: ${modelConfig.provider}`, 'custom', 'invalid_provider');
    }
    
    // Track token usage if organization ID is provided and not using custom tokens
    if (options.organizationId && !options.useCustomTokens) {
      // We'll update the token usage asynchronously to avoid blocking the response
      // Estimate output tokens (this is approximate)
      const estimatedOutputTokens = Math.ceil((customizedConfig.maxOutputTokens || 2000) * 0.7); // Assume 70% usage
      const totalTokens = estimatedInputTokens + estimatedOutputTokens;
      
      // Update token usage in the background
      updateTokenUsage(options.organizationId, totalTokens)
        .catch(error => console.error('Error updating token usage:', error));
    }
    
    return result;
  } catch (error) {
    // Handle provider-specific errors
    if (error instanceof OpenAIError) {
      // Convert OpenAI errors to generic AI service errors
      const serviceError = new AIServiceError(
        error.message,
        'openai',
        error.type,
        error.status
      );
      serviceError.retryAfter = error.retryAfter;

      // Handle rate limit errors with retry logic
      if (error.type === OpenAIErrorType.RATE_LIMIT && retryCount < MAX_RETRY_ATTEMPTS) {
        const delay = error.retryAfter
          ? error.retryAfter * 1000 // Convert seconds to milliseconds
          : calculateExponentialBackoff(retryCount);
          
        console.warn(`Rate limited by OpenAI. Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
        
        // Wait for the specified delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return generateCompletion(messages, options, retryCount + 1);
      }
      
      throw serviceError;
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