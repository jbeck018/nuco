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
    throw new Error(`Failed to generate completion: ${(error as Error).message}`);
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
    throw new Error(`Failed to generate embeddings: ${(error as Error).message}`);
  }
} 