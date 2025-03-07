/**
 * Context-Aware Prompting Utility
 * 
 * This module provides utilities for enhancing AI prompts with contextual information
 * based on user preferences, conversation history, and organization data.
 */

import { Message } from './service';
import { AiSettings } from '@/lib/db/types/metadata-types';
import { PromptTemplate } from './templates';
import { ContextSettings } from '@/lib/utils/ai-utils';

/**
 * Interface for context data that can be included in prompts
 */
interface ContextData {
  userConversationHistory?: Message[];
  organizationData?: {
    name: string;
    domain?: string;
    industry?: string;
    customData?: Record<string, unknown>;
  };
  userData?: {
    role?: string;
    preferences?: Record<string, unknown>;
    customData?: Record<string, unknown>;
  };
  contextSettings?: ContextSettings;
}

/**
 * Options for creating context-aware prompts
 */
interface ContextAwarePromptOptions {
  userPrompt: string;
  systemPrompt?: string;
  aiSettings?: AiSettings | null;
  template?: PromptTemplate;
  contextData?: ContextData;
}

/**
 * Create a context-aware system prompt based on user preferences and available context
 */
export function createContextAwareSystemPrompt(options: ContextAwarePromptOptions): string {
  const { 
    systemPrompt = '', 
    aiSettings, 
    contextData 
  } = options;
  
  // Start with the base system prompt
  let enhancedSystemPrompt = systemPrompt || 'You are a helpful AI assistant.';
  
  // Get context settings from either contextData or aiSettings
  const contextSettings: ContextSettings = contextData?.contextSettings || aiSettings?.contextSettings || {
    includeUserHistory: true,
    includeOrganizationData: true,
    contextWindowSize: 10
  };
  
  // Add conversation history context if available and enabled
  if (contextSettings.includeUserHistory && 
      contextData?.userConversationHistory?.length) {
    
    // Limit history based on context window size
    const maxHistoryItems = contextSettings.contextWindowSize;
    const relevantHistory = contextData.userConversationHistory
      .slice(-maxHistoryItems)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    
    enhancedSystemPrompt += `\n\nRecent conversation history:\n${relevantHistory}`;
  }
  
  // Add organization context if available and enabled
  if (contextSettings.includeOrganizationData && 
      contextData?.organizationData) {
    
    // Extract organization data
    const { name, domain, industry, customData } = contextData.organizationData;
    
    enhancedSystemPrompt += '\n\nOrganization context:';
    
    if (name) {
      enhancedSystemPrompt += `\nOrganization name: ${name}`;
    }
    
    if (domain) {
      enhancedSystemPrompt += `\nDomain: ${domain}`;
    }
    
    if (industry) {
      enhancedSystemPrompt += `\nIndustry: ${industry}`;
    }
    
    // Add any custom organization data
    if (customData && Object.keys(customData).length > 0) {
      enhancedSystemPrompt += '\nAdditional organization information:';
      for (const [key, value] of Object.entries(customData)) {
        enhancedSystemPrompt += `\n- ${key}: ${value}`;
      }
    }
  }
  
  // Add user context if available
  if (contextData?.userData) {
    // Extract user data
    const { role, preferences, customData } = contextData.userData;
    
    enhancedSystemPrompt += '\n\nUser context:';
    
    if (role) {
      enhancedSystemPrompt += `\nUser role: ${role}`;
    }
    
    // Add user preferences
    if (preferences && Object.keys(preferences).length > 0) {
      enhancedSystemPrompt += '\nUser preferences:';
      for (const [key, value] of Object.entries(preferences)) {
        enhancedSystemPrompt += `\n- ${key}: ${value}`;
      }
    }
    
    // Add any custom user data
    if (customData && Object.keys(customData).length > 0) {
      enhancedSystemPrompt += '\nAdditional user information:';
      for (const [key, value] of Object.entries(customData)) {
        enhancedSystemPrompt += `\n- ${key}: ${value}`;
      }
    }
  }
  
  return enhancedSystemPrompt;
}

/**
 * Prepare a complete context-aware message array for AI completion
 */
export function prepareContextAwareMessages(options: ContextAwarePromptOptions): Omit<Message, 'id' | 'createdAt'>[] {
  const { 
    userPrompt, 
    systemPrompt = '', 
    aiSettings, 
    contextData 
  } = options;
  
  // Create context-enhanced system prompt
  const enhancedSystemPrompt = createContextAwareSystemPrompt({
    userPrompt,
    systemPrompt,
    aiSettings,
    contextData
  });
  
  // Create messages array
  const messages: Omit<Message, 'id' | 'createdAt'>[] = [];
  
  // Add system message if we have one
  if (enhancedSystemPrompt) {
    messages.push({
      role: 'system',
      content: enhancedSystemPrompt
    });
  }
  
  // Add user message
  messages.push({
    role: 'user',
    content: userPrompt
  });
  
  return messages;
}

/**
 * Analyze context data to determine the most relevant information for the prompt
 */
export function analyzeContextRelevance(userPrompt: string, contextData?: ContextData): string[] {
  const relevantContextItems: string[] = [];
  
  if (!contextData) {
    return relevantContextItems;
  }
  
  // Simple keyword matching for relevance (in a real app, this would use 
  // embeddings and semantic similarity)
  const promptLower = userPrompt.toLowerCase();
  
  // Check for organization name mentions
  if (contextData.organizationData?.name && 
      promptLower.includes(contextData.organizationData.name.toLowerCase())) {
    relevantContextItems.push('organization-name');
  }
  
  // Check for industry mentions
  if (contextData.organizationData?.industry && 
      promptLower.includes(contextData.organizationData.industry.toLowerCase())) {
    relevantContextItems.push('organization-industry');
  }
  
  // Check for references to history
  if (promptLower.includes('previous') || 
      promptLower.includes('before') || 
      promptLower.includes('earlier') ||
      promptLower.includes('last time')) {
    relevantContextItems.push('conversation-history');
  }
  
  // Check for references to user preferences/role
  if (promptLower.includes('preference') || 
      promptLower.includes('settings') || 
      promptLower.includes('role') ||
      promptLower.includes('my job')) {
    relevantContextItems.push('user-preferences');
  }
  
  return relevantContextItems;
}

/**
 * Apply context-aware prompting to an AI message based on user preferences
 */
export function applyContextAwarePrompting(options: ContextAwarePromptOptions): Omit<Message, 'id' | 'createdAt'>[] {
  // Analyze context relevance
  const relevantContextItems = analyzeContextRelevance(options.userPrompt, options.contextData);
  
  // If template is provided, use it
  if (options.template) {
    // Template handling would go here (beyond scope of this implementation)
    // This would involve applying template variables with context data
  }
  
  // Prepare context-aware messages
  return prepareContextAwareMessages({
    ...options,
    // Add metadata for tracking which context elements were deemed relevant
    contextData: options.contextData ? {
      ...options.contextData,
      userData: {
        ...options.contextData.userData,
        customData: {
          ...(options.contextData.userData?.customData || {}),
          relevantContextItems
        }
      }
    } : undefined
  });
} 