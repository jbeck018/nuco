/**
 * AI Service
 * 
 * This file provides a unified interface for interacting with various AI providers.
 * It handles provider selection, message formatting, and response processing.
 */
import { StreamTextResult, ToolSet } from 'ai';
import { AIProvider, ModelConfig, getModelById, DEFAULT_MODEL_ID } from './config';
import { generateOpenAIStream, OpenAIFunction, OpenAIError, OpenAIErrorType } from './providers/openai';

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
}

/**
 * Generic AI Error class 
 */
export class AIServiceError extends Error {
  provider: AIProvider;
  status?: number;
  retryAfter?: number;
  type: string;

  constructor(message: string, provider: AIProvider, type: string = 'unknown', status?: number) {
    super(message);
    this.name = 'AIServiceError';
    this.provider = provider;
    this.status = status;
    this.type = type;
  }
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
 * Generate a streaming completion from the AI service with retry logic
 * @param messages The messages to send to the API
 * @param options The options for the completion
 * @param retryCount Current retry count (used internally)
 * @returns A streaming response from the API
 */
export async function generateCompletion(
  messages: Omit<Message, 'id' | 'createdAt'>[],
  options: CompletionOptions = {},
  retryCount = 0
): Promise<StreamTextResult<ToolSet, never>> {
  // Get the model configuration
  const modelId = options.modelId || DEFAULT_MODEL_ID;
  const modelConfig = getModelById(modelId);
  
  if (!modelConfig) {
    throw new AIServiceError(`Model ${modelId} not found`, 'custom', 'invalid_model');
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
  
  try {
    // Generate the completion based on the provider
    switch (modelConfig.provider) {
      case 'openai':
        return await generateOpenAIStream(formattedMessages, customizedConfig, options.functions);
      case 'anthropic':
        // TODO: Implement Anthropic provider
        throw new AIServiceError('Anthropic provider not implemented yet', 'anthropic', 'not_implemented');
      case 'google':
        // TODO: Implement Google provider
        throw new AIServiceError('Google provider not implemented yet', 'google', 'not_implemented');
      case 'custom':
        // TODO: Implement custom provider
        throw new AIServiceError('Custom provider not implemented yet', 'custom', 'not_implemented');
      default:
        throw new AIServiceError(`Unsupported provider: ${modelConfig.provider}`, 'custom', 'invalid_provider');
    }
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
 * Format messages for the API
 * @param messages The messages to format
 * @param systemPrompt An optional system prompt to prepend
 * @returns Formatted messages for the API
 */
function formatMessages(
  messages: Omit<Message, 'id' | 'createdAt'>[],
  systemPrompt?: string
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const formattedMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  
  // Add system prompt if provided
  if (systemPrompt) {
    formattedMessages.push({
      role: 'system',
      content: systemPrompt,
    });
  }
  
  // Add the rest of the messages
  formattedMessages.push(...messages);
  
  return formattedMessages;
}

/**
 * Count the number of tokens in a string
 * @param text The text to count tokens for
 * @param provider The provider to use for counting
 * @returns The number of tokens in the text
 */
export async function countTokens(text: string, provider: AIProvider = 'openai'): Promise<number> {
  switch (provider) {
    case 'openai':
      // Simple approximation (1 token ≈ 4 characters)
      return Math.ceil(text.length / 4);
    case 'anthropic':
      // Fallback to a simple approximation (1 token ≈ 4 characters)
      return Math.ceil(text.length / 4);
    case 'google':
      // Fallback to a simple approximation (1 token ≈ 4 characters)
      return Math.ceil(text.length / 4);
    case 'custom':
      // Fallback to a simple approximation (1 token ≈ 4 characters)
      return Math.ceil(text.length / 4);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
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