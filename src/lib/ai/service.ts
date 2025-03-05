/**
 * AI Service
 * 
 * This file provides a unified interface for interacting with various AI providers.
 * It handles provider selection, message formatting, and response processing.
 */
import { StreamTextResult, ToolSet } from 'ai';
import { AIProvider, ModelConfig, getModelById, DEFAULT_MODEL_ID } from './config';
import { generateOpenAIStream, OpenAIFunction } from './providers/openai';

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
 * Generate a streaming completion from the AI service
 * @param messages The messages to send to the API
 * @param options The options for the completion
 * @returns A streaming response from the API
 */
export async function generateCompletion(
  messages: Omit<Message, 'id' | 'createdAt'>[],
  options: CompletionOptions = {}
): Promise<StreamTextResult<ToolSet, never>> {
  // Get the model configuration
  const modelId = options.modelId || DEFAULT_MODEL_ID;
  const modelConfig = getModelById(modelId);
  
  if (!modelConfig) {
    throw new Error(`Model ${modelId} not found`);
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
  
  // Generate the completion based on the provider
  switch (modelConfig.provider) {
    case 'openai':
      return generateOpenAIStream(formattedMessages, customizedConfig, options.functions);
    case 'anthropic':
      // TODO: Implement Anthropic provider
      throw new Error('Anthropic provider not implemented yet');
    case 'google':
      // TODO: Implement Google provider
      throw new Error('Google provider not implemented yet');
    case 'custom':
      // TODO: Implement custom provider
      throw new Error('Custom provider not implemented yet');
    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }
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