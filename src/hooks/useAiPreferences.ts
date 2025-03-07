/**
 * useAiPreferences.ts
 * 
 * A hook for accessing and managing user-specific AI preferences from metadata storage.
 * This enables context-aware prompting that adapts to user preferences.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTRPC } from '@/lib/trpc/trpc';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { AiSettings } from '@/lib/db/types/metadata-types';

export interface UseAiPreferencesResult {
  preferences: AiSettings | null;
  isLoading: boolean;
  error: Error | null;
  updateDefaultModel: (modelId: string) => Promise<void>;
  updateMaxTokens: (tokens: number) => Promise<void>;
  updateTemplatePreferences: (templateIds: Array<{ id: string; name: string; isDefault?: boolean }>) => Promise<void>;
  updateContextSettings: (settings: {
    includeUserHistory?: boolean;
    includeOrganizationData?: boolean;
    contextWindowSize?: number;
  }) => Promise<void>;
  reset: () => Promise<void>;
}

// Default AI preferences
const DEFAULT_AI_PREFERENCES: AiSettings = {
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
 * Type guard to validate if an object conforms to the AiSettings interface
 * This provides runtime validation of the AiSettings type
 */
export function isValidAiSettings(obj: unknown): obj is AiSettings {
  if (!obj || typeof obj !== 'object') return false;
  
  const settings = obj as Record<string, unknown>;
  
  // Check required fields
  if (typeof settings.defaultModel !== 'string') return false;
  if (typeof settings.maxTokensPerRequest !== 'number') return false;
  if (!Array.isArray(settings.promptTemplates)) return false;
  
  // Validate promptTemplates array items
  for (const template of settings.promptTemplates) {
    if (typeof template !== 'object' || template === null) return false;
    const t = template as Record<string, unknown>;
    if (typeof t.id !== 'string' || typeof t.name !== 'string') return false;
    if (t.isDefault !== undefined && typeof t.isDefault !== 'boolean') return false;
  }
  
  // Validate contextSettings if present
  if (settings.contextSettings !== undefined) {
    if (typeof settings.contextSettings !== 'object' || settings.contextSettings === null) return false;
    
    const ctx = settings.contextSettings as Record<string, unknown>;
    if (typeof ctx.includeUserHistory !== 'boolean') return false;
    if (typeof ctx.includeOrganizationData !== 'boolean') return false;
    if (typeof ctx.contextWindowSize !== 'number') return false;
  }
  
  return true;
}

export function useAiPreferences(): UseAiPreferencesResult {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<AiSettings | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Get metadata utils
  const queryClient = useQueryClient();

  // Query for user preferences
  const { data, isLoading } = useQuery(trpc.metadata.getUserFlexiblePreferences.queryOptions(
    { key: 'aiSettings' },
    { 
      enabled: !!session?.user?.id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  ));

  // Mutation for updating preferences
  const updatePreferencesMutation = useMutation(trpc.metadata.setUserFlexiblePreferences.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(
        trpc.metadata.getUserFlexiblePreferences.queryFilter({ key: 'aiSettings' })
      );
    },
    onError: (error) => {
      setError(new Error(error.message));
      toast({
        title: 'Error',
        description: 'Failed to update AI preferences',
        variant: 'destructive',
      });
    },
  }));

  // Update preferences when data changes
  useEffect(() => {
    // @ts-nocheck
    if (data?.value) {
      try {
        // Use a simpler approach to avoid deep type instantiation
        const valueAsRecord = data.value as Record<string, unknown>;
        
        // Create a properly typed object with default values
        const typedSettings: AiSettings = {
          defaultModel: DEFAULT_AI_PREFERENCES.defaultModel,
          maxTokensPerRequest: DEFAULT_AI_PREFERENCES.maxTokensPerRequest,
          promptTemplates: DEFAULT_AI_PREFERENCES.promptTemplates,
        };
        
        // Add default contextSettings
        typedSettings.contextSettings = {
          includeUserHistory: true,
          includeOrganizationData: true,
          contextWindowSize: 10,
        };
        
        // Override with actual values if they exist and are of the correct type
        if (typeof valueAsRecord.defaultModel === 'string') {
          typedSettings.defaultModel = valueAsRecord.defaultModel;
        }
        
        if (typeof valueAsRecord.maxTokensPerRequest === 'number') {
          typedSettings.maxTokensPerRequest = valueAsRecord.maxTokensPerRequest;
        }
        
        if (Array.isArray(valueAsRecord.promptTemplates)) {
          typedSettings.promptTemplates = valueAsRecord.promptTemplates as Array<{ id: string; name: string; isDefault?: boolean }>;
        }
        
        // Handle contextSettings separately
        if (valueAsRecord.contextSettings && typeof valueAsRecord.contextSettings === 'object') {
          const contextSettings = valueAsRecord.contextSettings as Record<string, unknown>;
          
          // Ensure contextSettings exists
          if (!typedSettings.contextSettings) {
            typedSettings.contextSettings = {
              includeUserHistory: true,
              includeOrganizationData: true,
              contextWindowSize: 10,
            };
          }
          
          // Only override if the values are of the correct type
          if (typeof contextSettings.includeUserHistory === 'boolean') {
            typedSettings.contextSettings.includeUserHistory = contextSettings.includeUserHistory;
          }
          
          if (typeof contextSettings.includeOrganizationData === 'boolean') {
            typedSettings.contextSettings.includeOrganizationData = contextSettings.includeOrganizationData;
          }
          
          if (typeof contextSettings.contextWindowSize === 'number') {
            typedSettings.contextSettings.contextWindowSize = contextSettings.contextWindowSize;
          }
        }
        
        // Validate the settings with our type guard
        if (isValidAiSettings(typedSettings)) {
          setPreferences(typedSettings);
        } else {
          console.error('Invalid AI settings format after parsing');
          setError(new Error('Invalid AI settings format'));
          // Set to default preferences as a fallback
          setPreferences(DEFAULT_AI_PREFERENCES);
        }
      } catch (parseError) {
        console.error('Error parsing AI settings:', parseError);
        setError(new Error('Invalid AI settings format'));
        // Set to default preferences as a fallback
        setPreferences(DEFAULT_AI_PREFERENCES);
      }
    }
  }, [data]);

  // Helper for updating preferences
  const updatePreferences = useCallback(async (updates: Partial<AiSettings>) => {
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }
    
    // Initialize with defaults if no existing preferences
    const currentPreferences = preferences || DEFAULT_AI_PREFERENCES;
    
    try {
      return await updatePreferencesMutation.mutateAsync({
        key: 'aiSettings',
        value: {
          ...currentPreferences,
          ...updates,
        },
      });
    } catch {
      // Error handled by mutation onError
      return undefined;
    }
  }, [preferences, session?.user?.id, updatePreferencesMutation]);

  // Update default model
  const updateDefaultModel = useCallback(async (modelId: string) => {
    await updatePreferences({ defaultModel: modelId });
    
    toast({
      title: 'Preferences Updated',
      description: 'Default AI model has been updated',
    });
  }, [updatePreferences, toast]);

  // Update max tokens
  const updateMaxTokens = useCallback(async (tokens: number) => {
    await updatePreferences({ maxTokensPerRequest: tokens });
    
    toast({
      title: 'Preferences Updated',
      description: 'Maximum tokens per request has been updated',
    });
  }, [updatePreferences, toast]);

  // Update template preferences
  const updateTemplatePreferences = useCallback(async (
    templateIds: Array<{ id: string; name: string; isDefault?: boolean }>
  ) => {
    await updatePreferences({ promptTemplates: templateIds });
    
    toast({
      title: 'Preferences Updated',
      description: 'Prompt template preferences have been updated',
    });
  }, [updatePreferences, toast]);

  // Update context settings
  const updateContextSettings = useCallback(async (settings: {
    includeUserHistory?: boolean;
    includeOrganizationData?: boolean;
    contextWindowSize?: number;
  }) => {
    // Initialize with defaults if no existing context settings
    const currentContextSettings = preferences?.contextSettings || DEFAULT_AI_PREFERENCES.contextSettings;
    
    if (!currentContextSettings) {
      throw new Error('Context settings not properly initialized');
    }
    
    // Ensure all required properties are present with non-optional values
    const updatedSettings = {
      includeUserHistory: settings.includeUserHistory ?? currentContextSettings.includeUserHistory,
      includeOrganizationData: settings.includeOrganizationData ?? currentContextSettings.includeOrganizationData,
      contextWindowSize: settings.contextWindowSize ?? currentContextSettings.contextWindowSize
    };
    
    await updatePreferences({
      contextSettings: updatedSettings
    });
    
    toast({
      title: 'Preferences Updated',
      description: 'AI context settings have been updated',
    });
  }, [preferences, updatePreferences, toast]);

  // Reset preferences to default
  const reset = useCallback(async () => {
    await updatePreferencesMutation.mutateAsync({
      key: 'aiSettings',
      value: DEFAULT_AI_PREFERENCES,
    });
    
    toast({
      title: 'Preferences Reset',
      description: 'AI preferences have been reset to default values',
    });
  }, [updatePreferencesMutation, toast]);

  return {
    preferences,
    isLoading,
    error,
    updateDefaultModel,
    updateMaxTokens,
    updateTemplatePreferences,
    updateContextSettings,
    reset,
  };
} 