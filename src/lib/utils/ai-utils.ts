/**
 * ai-utils.ts
 * 
 * Utility functions for working with AI preferences and settings
 * with proper type safety and validation.
 */
import { isValidAiSettings } from '@/hooks/useAiPreferences';
import { AiSettings } from '@/lib/db/types/metadata-types';

// Define the context settings type for reuse
export interface ContextSettings {
  includeUserHistory: boolean;
  includeOrganizationData: boolean;
  contextWindowSize: number;
}

/**
 * Default AI settings to use as fallback
 */
export const DEFAULT_AI_SETTINGS: AiSettings = {
  defaultModel: 'gpt-3.5-turbo',
  maxTokensPerRequest: 2000,
  promptTemplates: [],
  contextSettings: {
    includeUserHistory: true,
    includeOrganizationData: true,
    contextWindowSize: 10,
  }
};

/**
 * Safely get the default model from AI preferences
 * @param preferences The AI preferences object, which might be null
 * @param fallback Optional fallback value if preferences are invalid
 * @returns The default model string
 */
export function getDefaultModel(preferences: AiSettings | null, fallback = 'gpt-3.5-turbo'): string {
  if (!preferences) return fallback;
  return preferences.defaultModel || fallback;
}

/**
 * Safely get the max tokens from AI preferences
 * @param preferences The AI preferences object, which might be null
 * @param fallback Optional fallback value if preferences are invalid
 * @returns The max tokens number
 */
export function getMaxTokens(preferences: AiSettings | null, fallback = 2000): number {
  if (!preferences) return fallback;
  return preferences.maxTokensPerRequest || fallback;
}

/**
 * Safely get context settings from AI preferences
 * @param preferences The AI preferences object, which might be null
 * @returns The context settings with default values for missing properties
 */
export function getContextSettings(preferences: AiSettings | null): ContextSettings {
  // Create a copy of the default settings to ensure it's not undefined
  const defaultSettings: ContextSettings = {
    includeUserHistory: true,
    includeOrganizationData: true,
    contextWindowSize: 10
  };
  
  if (!preferences || !preferences.contextSettings) {
    return defaultSettings;
  }
  
  return {
    includeUserHistory: 
      preferences.contextSettings.includeUserHistory !== undefined 
        ? preferences.contextSettings.includeUserHistory 
        : defaultSettings.includeUserHistory,
    includeOrganizationData: 
      preferences.contextSettings.includeOrganizationData !== undefined 
        ? preferences.contextSettings.includeOrganizationData 
        : defaultSettings.includeOrganizationData,
    contextWindowSize: 
      preferences.contextSettings.contextWindowSize !== undefined 
        ? preferences.contextSettings.contextWindowSize 
        : defaultSettings.contextWindowSize,
  };
}

/**
 * Safely validate and normalize AI settings
 * @param settings The AI settings object to validate
 * @returns A valid AiSettings object
 */
export function validateAndNormalizeAiSettings(settings: unknown): AiSettings {
  if (isValidAiSettings(settings)) {
    return settings;
  }
  
  return DEFAULT_AI_SETTINGS;
}

/**
 * Apply context-aware settings to a prompt
 * @param prompt The original prompt
 * @param preferences The AI preferences
 * @returns The enhanced prompt with context settings applied
 */
export function applyContextSettings(prompt: string, preferences: AiSettings | null): string {
  const contextSettings = getContextSettings(preferences);
  
  // This is a simplified example - in a real implementation, you would:
  // 1. Apply user history if includeUserHistory is true
  // 2. Apply organization data if includeOrganizationData is true
  // 3. Limit context window based on contextWindowSize
  
  let enhancedPrompt = prompt;
  
  if (contextSettings.includeUserHistory) {
    enhancedPrompt = `[Context: User history enabled] ${enhancedPrompt}`;
  }
  
  if (contextSettings.includeOrganizationData) {
    enhancedPrompt = `[Context: Organization data enabled] ${enhancedPrompt}`;
  }
  
  return enhancedPrompt;
} 