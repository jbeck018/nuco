/**
 * OpenAI Provider Implementation
 * 
 * This file contains the implementation of the OpenAI provider for the AI service.
 * It handles communication with the OpenAI API and provides methods for generating completions.
 */

import { openai } from '@ai-sdk/openai';
import { embed, streamText } from 'ai';
import { ModelConfig } from '../config';

/**
 * Type definition for OpenAI function
 */
export interface OpenAIFunction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  required?: string[];
}

/**
 * OpenAI API error types
 */
export enum OpenAIErrorType {
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
 * Custom error class for OpenAI API errors
 */
export class OpenAIError extends Error {
  type: OpenAIErrorType;
  status?: number;
  retryAfter?: number;

  constructor(message: string, type: OpenAIErrorType = OpenAIErrorType.UNKNOWN, status?: number) {
    super(message);
    this.name = 'OpenAIError';
    this.type = type;
    this.status = status;
  }
}

/**
 * Parse OpenAI API error response and return a standardized error
 */
function parseOpenAIError(error: unknown): OpenAIError {
  if (typeof error === 'object' && error !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as Record<string, any>;
    
    // Handle rate limit errors
    if (err.status === 429 || (err.error?.type === 'rate_limit_exceeded')) {
      const retryAfter = err.headers?.['retry-after'] ? parseInt(err.headers['retry-after'], 10) : undefined;
      const error = new OpenAIError(
        'Rate limit exceeded. Please try again later.',
        OpenAIErrorType.RATE_LIMIT,
        429
      );
      error.retryAfter = retryAfter;
      return error;
    }
    
    // Handle token limit errors
    if (err.status === 400 && err.error?.code === 'context_length_exceeded') {
      return new OpenAIError(
        'The input is too long for the model to process. Please reduce the length of your prompt.',
        OpenAIErrorType.TOKEN_LIMIT,
        400
      );
    }
    
    // Handle authentication errors
    if (err.status === 401) {
      return new OpenAIError(
        'Authentication error: Invalid API key or token.',
        OpenAIErrorType.AUTHENTICATION,
        401
      );
    }
    
    // Handle permissions errors
    if (err.status === 403) {
      return new OpenAIError(
        'You do not have permission to access this resource or model.',
        OpenAIErrorType.PERMISSIONS,
        403
      );
    }
    
    // Handle server errors
    if (err.status >= 500) {
      return new OpenAIError(
        'OpenAI server error. Please try again later.',
        OpenAIErrorType.SERVER_ERROR,
        err.status
      );
    }
    
    // Handle invalid requests
    if (err.status === 400) {
      return new OpenAIError(
        err.error?.message || 'Invalid request to OpenAI API.',
        OpenAIErrorType.INVALID_REQUEST,
        400
      );
    }
    
    // If we have an error message, use it
    if (err.message) {
      return new OpenAIError(String(err.message));
    }
  }
  
  // Default error handling for network issues
  if (error instanceof Error) {
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return new OpenAIError(
        'Request to OpenAI API timed out. Please try again later.',
        OpenAIErrorType.TIMEOUT
      );
    }
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return new OpenAIError(
        'Could not connect to OpenAI API. Please check your internet connection.',
        OpenAIErrorType.CONNECTION
      );
    }
    
    return new OpenAIError(error.message);
  }
  
  // Fallback for unknown errors
  return new OpenAIError(
    'An unknown error occurred with the OpenAI API.',
    OpenAIErrorType.UNKNOWN
  );
}

/**
 * Generate a streaming completion from OpenAI
 * @param messages The messages to send to the API
 * @param modelConfig The model configuration to use
 * @param functions Optional functions for function calling (not implemented yet)
 * @returns A streaming response from the API
 */
export async function generateOpenAIStream(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  modelConfig: ModelConfig,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  functions?: OpenAIFunction[]
) {
  // Validate that this is an OpenAI model
  if (modelConfig.provider !== 'openai') {
    throw new Error(`Model ${modelConfig.id} is not an OpenAI model`);
  }

  try {
    // For now, we'll just use streamText for all completions
    // Function calling will be implemented in a future update
    // when the correct imports from the Vercel AI SDK are available
    // TODO: Implement function calling with the correct imports
    
    // Use streamText for regular text completion
    return streamText({
      model: openai(modelConfig.id),
      messages,
      temperature: modelConfig.temperature,
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw parseOpenAIError(error);
  }
}

/**
 * Count the number of tokens in a string using OpenAI's tokenizer
 * @param text The text to count tokens for
 * @returns The number of tokens in the text
 */
export async function countOpenAITokens(text: string): Promise<number> {
  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: text,
    });
    
    return embedding.length;
  } catch (error) {
    console.error('Token counting error:', error);
    // Fallback to a simple approximation (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4);
  }
}

/**
 * Generate embeddings for a text using OpenAI
 * @param text The text to generate embeddings for
 * @returns The embeddings for the text
 */
export async function generateOpenAIEmbeddings(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: text,
    });
    
    return embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw parseOpenAIError(error);
  }
} 