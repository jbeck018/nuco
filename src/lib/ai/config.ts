/**
 * AI Provider Configuration
 * 
 * This file contains the configuration for AI providers and models.
 * It defines the available providers, models, and their settings.
 */

import { z } from 'zod';

/**
 * Supported AI providers
 */
export const aiProviderEnum = z.enum(['openai', 'anthropic', 'google', 'custom']);
export type AIProvider = z.infer<typeof aiProviderEnum>;

/**
 * Model configuration schema
 */
export const modelConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: aiProviderEnum,
  contextWindow: z.number(),
  maxOutputTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(1),
  frequencyPenalty: z.number().min(0).max(2).default(0),
  presencePenalty: z.number().min(0).max(2).default(0),
  costPer1kInput: z.number().default(0),
  costPer1kOutput: z.number().default(0),
  inputTokenCounter: z.function()
    .args(z.string())
    .returns(z.promise(z.number()))
    .optional(),
  outputTokenCounter: z.function()
    .args(z.string())
    .returns(z.promise(z.number()))
    .optional(),
});

export type ModelConfig = z.infer<typeof modelConfigSchema>;

/**
 * Default OpenAI models
 */
export const openAIModels: ModelConfig[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextWindow: 16385,
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0015,
  },
];

/**
 * Default Anthropic models
 */
export const anthropicModels: ModelConfig[] = [
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.00125,
  },
];

/**
 * Default Google models
 */
export const googleModels: ModelConfig[] = [
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    contextWindow: 32768,
    maxOutputTokens: 2048,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.0005,
  },
  {
    id: 'gemini-ultra',
    name: 'Gemini Ultra',
    provider: 'google',
    contextWindow: 32768,
    maxOutputTokens: 2048,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.00375,
  },
];

/**
 * All available models
 */
export const availableModels: ModelConfig[] = [
  ...openAIModels,
  ...anthropicModels,
  ...googleModels,
];

/**
 * Get a model by ID
 * @param modelId The model ID to find
 * @returns The model configuration or undefined if not found
 */
export function getModelById(modelId: string): ModelConfig | undefined {
  return availableModels.find(model => model.id === modelId);
}

/**
 * Get models by provider
 * @param provider The provider to filter by
 * @returns An array of model configurations for the specified provider
 */
export function getModelsByProvider(provider: AIProvider): ModelConfig[] {
  return availableModels.filter(model => model.provider === provider);
}

/**
 * Default model ID to use if none is specified
 */
export const DEFAULT_MODEL_ID = 'gpt-3.5-turbo'; 