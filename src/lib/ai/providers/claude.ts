/**
 * Claude (Anthropic) Provider Implementation
 * 
 * This file contains the implementation of the Claude provider for the AI service.
 * It handles communication with the Anthropic API and provides methods for generating completions.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { embed, streamText } from 'ai';
import { ModelConfig } from '../config';

/**
 * Claude API error types
 */
export enum ClaudeErrorType {
  RATE_LIMIT = 'rate_limit',
  TOKEN_LIMIT = 'token_limit',
  INVALID_REQUEST = 'invalid_request',
  AUTHENTICATION = 'authentication',
  PERMISSIONS = 'permissions',
  SERVER_ERROR = 'server_error',
  CONNECTION = 'connection',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * Custom error class for Claude API errors
 */
export class ClaudeError extends Error {
  type: ClaudeErrorType;
  status?: number;
  retryAfter?: number;

  constructor(message: string, type: ClaudeErrorType = ClaudeErrorType.UNKNOWN, status?: number) {
    super(message);
    this.name = 'ClaudeError';
    this.type = type;
    this.status = status;
  }
}

/**
 * Parse Claude API error response and return a standardized error
 */
function parseClaudeError(error: unknown): ClaudeError {
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, any>;
    
    // Handle rate limit errors
    if (err.status === 429 || err.error?.type === 'rate_limit_error') {
      const retryAfter = err.headers?.['retry-after'] ? parseInt(err.headers['retry-after'], 10) : undefined;
      const error = new ClaudeError(
        'Rate limit exceeded. Please try again later.',
        ClaudeErrorType.RATE_LIMIT,
        429
      );
      error.retryAfter = retryAfter;
      return error;
    }
    
    // Handle token limit errors
    if (err.status === 400 && (
      err.error?.type === 'context_length_exceeded' || 
      err.error?.message?.includes('maximum context length')
    )) {
      return new ClaudeError(
        'The input is too long for the model to process. Please reduce the length of your prompt.',
        ClaudeErrorType.TOKEN_LIMIT,
        400
      );
    }
    
    // Handle authentication errors
    if (err.status === 401) {
      return new ClaudeError(
        'Authentication error: Invalid API key or token.',
        ClaudeErrorType.AUTHENTICATION,
        401
      );
    }
    
    // Handle permissions errors
    if (err.status === 403) {
      return new ClaudeError(
        'You do not have permission to access this resource or model.',
        ClaudeErrorType.PERMISSIONS,
        403
      );
    }
    
    // Handle server errors
    if (err.status >= 500) {
      return new ClaudeError(
        'Claude server error. Please try again later.',
        ClaudeErrorType.SERVER_ERROR,
        err.status
      );
    }
    
    // Handle invalid requests
    if (err.status === 400) {
      return new ClaudeError(
        err.error?.message || 'Invalid request to Claude API.',
        ClaudeErrorType.INVALID_REQUEST,
        400
      );
    }
    
    // If we have an error message, use it
    if (err.message) {
      return new ClaudeError(String(err.message));
    }
  }
  
  // Default error handling for network issues
  if (error instanceof Error) {
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return new ClaudeError(
        'Request to Claude API timed out. Please try again later.',
        ClaudeErrorType.TIMEOUT
      );
    }
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return new ClaudeError(
        'Could not connect to Claude API. Please check your internet connection.',
        ClaudeErrorType.CONNECTION
      );
    }
    
    return new ClaudeError(error.message);
  }
  
  // Fallback for unknown errors
  return new ClaudeError(
    'An unknown error occurred with the Claude API.',
    ClaudeErrorType.UNKNOWN
  );
}

/**
 * Generate a streaming completion from Claude
 * @param messages The messages to send to the API
 * @param modelConfig The model configuration to use
 * @param apiKey Optional custom API key to use instead of the default
 * @returns A streaming response from the API
 */
export async function generateClaudeStream(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  modelConfig: ModelConfig,
  apiKey?: string
) {
  // Validate that this is a Claude model
  if (modelConfig.provider !== 'anthropic') {
    throw new Error(`Model ${modelConfig.id} is not a Claude model`);
  }

  console.log('apiKey', apiKey || process.env.ANTHROPIC_API_KEY);

  const anthropicClient = createAnthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
  });
  

  try {
    // Use streamText for text completion
    return streamText({
      model: anthropicClient(modelConfig.id),
      messages,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxOutputTokens,
      topP: modelConfig.topP,
    });
  } catch (error) {
    console.error('Claude API error:', error);
    throw parseClaudeError(error);
  }
}

/**
 * Count the number of tokens in a string using Claude's tokenizer
 * Note: This is an approximation as Claude doesn't expose a direct token counting API
 * @param text The text to count tokens for
 * @returns The number of tokens in the text
 */
export async function countClaudeTokens(text: string): Promise<number> {
  try {
    // Claude doesn't have a direct token counting API through the AI SDK
    // This is a simple approximation (1 token ≈ 4 characters for English text)
    // For production use, consider using a more accurate tokenizer like 'claude-tokenizer' npm package
    return Math.ceil(text.length / 4);
  } catch (error) {
    console.error('Token counting error:', error);
    // Fallback to a simple approximation
    return Math.ceil(text.length / 4);
  }
}

/**
 * Generate embeddings for a text using Claude
 * Note: Claude doesn't have a dedicated embeddings API through the AI SDK yet
 * This is a placeholder for future implementation
 * @param text The text to generate embeddings for
 * @returns The embeddings for the text
 */
export async function generateClaudeEmbeddings(text: string): Promise<number[]> {
  // Claude doesn't have a dedicated embeddings API through the AI SDK yet
  // This is a placeholder that throws an error
  throw new ClaudeError(
    'Claude embeddings are not supported yet.',
    ClaudeErrorType.INVALID_REQUEST
  );
}
