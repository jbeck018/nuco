/**
 * useIntegrationSettings.ts
 * 
 * A hook for managing integration settings with optimistic updates.
 * This hook provides a convenient interface for reading and updating integration-specific settings.
 */
import { useTRPC } from '@/lib/trpc/trpc';
import { useCallback } from 'react';

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Types for integration settings
 */
export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly';

export interface SyncSettings {
  lastSyncTime?: string;
  objectsToSync?: string[];
  fieldMappings?: Record<string, string>;
  fields?: string[];
  excludedFields?: string[];
  syncDirection?: 'oneway' | 'bidirectional';
  conflictResolution?: 'newest' | 'manual' | 'integration' | 'nuco';
}

export interface WebhookSettings {
  enabled?: boolean;
  events?: string[];
  url?: string;
  secret?: string;
}

export interface ApiSettings {
  rateLimit?: number;
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffFactor: number;
  };
  customEndpoints?: Record<string, string>;
}

export interface IntegrationSettings {
  id: string;
  createdAt: string;
  updatedAt: string;
  integrationId: string;
  syncFrequency: SyncFrequency;
  syncSettings: SyncSettings | null;
  webhookSettings: WebhookSettings | null;
  apiSettings: ApiSettings | null;
}

/**
 * Hook to manage integration settings
 */
export const useIntegrationSettings = (integrationId: string) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Query for fetching integration settings
  const settingsQuery = useQuery(
    trpc.metadata.getIntegrationSettings.queryOptions(
      { integrationId },
      {
        enabled: !!integrationId,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      }
    )
  );

  const { data: settings, isLoading, error } = settingsQuery;

  // Mutation for updating integration settings
  const updateMutation = useMutation(trpc.metadata.updateIntegrationSettings.mutationOptions({
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(trpc.metadata.getIntegrationSettings.queryFilter({ integrationId }));
      
      // Get current data from cache
      const previousData = queryClient.getQueryData(trpc.metadata.getIntegrationSettings.queryKey({ integrationId }));
      
      // Optimistically update the cache with new data
      if (previousData) {
        queryClient.setQueryData(
          trpc.metadata.getIntegrationSettings.queryKey({ integrationId }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (input: any) => {
            // Cast input to IntegrationSettings
            const oldData = input as IntegrationSettings | undefined;
            if (!oldData) return oldData;
            
            // Create updated data by merging old and new
            return {
              ...oldData,
              ...newData,
              // Handle nested objects correctly
              syncSettings: newData.syncSettings 
                ? { ...(oldData.syncSettings || {}), ...newData.syncSettings } 
                : oldData.syncSettings,
              webhookSettings: newData.webhookSettings 
                ? { ...(oldData.webhookSettings || {}), ...newData.webhookSettings } 
                : oldData.webhookSettings,
              apiSettings: newData.apiSettings 
                ? { ...(oldData.apiSettings || {}), ...newData.apiSettings } 
                : oldData.apiSettings,
            };
          }
        );
      }
      
      return { previousData };
    },
    
    // If the mutation fails, roll back to the previous value
    onError: (err, newData, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          trpc.metadata.getIntegrationSettings.queryKey({ integrationId }),
          context.previousData
        );
      }
    },
    
    // After success or error, invalidate the query to ensure data consistency
    onSettled: () => {
      queryClient.invalidateQueries(trpc.metadata.getIntegrationSettings.queryFilter({ integrationId }));
    },
  }));

  // Convenience method for updating sync frequency
  const setSyncFrequency = useCallback((syncFrequency: SyncFrequency) => {
    updateMutation.mutate({
      integrationId,
      syncFrequency,
    });
  }, [integrationId, updateMutation]);

  // Convenience method for updating sync settings
  const setSyncSettings = useCallback((syncSettings: Partial<SyncSettings>) => {
    const currentSettings = settings as IntegrationSettings | undefined;
    updateMutation.mutate({
      integrationId,
      syncSettings: {
        ...(currentSettings?.syncSettings || {}),
        ...syncSettings,
      },
    });
  }, [integrationId, settings, updateMutation]);

  // Convenience method for updating API settings
  const setApiSettings = useCallback((apiSettings: Partial<ApiSettings>) => {
    const currentSettings = settings as IntegrationSettings | undefined;
    updateMutation.mutate({
      integrationId,
      apiSettings: {
        ...(currentSettings?.apiSettings || {}),
        ...apiSettings,
      },
    });
  }, [integrationId, settings, updateMutation]);

  // Convenience method for updating fields to sync
  const setFields = useCallback((fields: string[]) => {
    setSyncSettings({ fields });
  }, [setSyncSettings]);

  // Convenience method for updating excluded fields
  const setExcludedFields = useCallback((excludedFields: string[]) => {
    setSyncSettings({ excludedFields });
  }, [setSyncSettings]);

  // Convenience method for updating sync direction
  const setSyncDirection = useCallback((syncDirection: 'oneway' | 'bidirectional') => {
    setSyncSettings({ syncDirection });
  }, [setSyncSettings]);

  // Convenience method for updating conflict resolution strategy
  const setConflictResolution = useCallback((conflictResolution: 'newest' | 'manual' | 'integration' | 'nuco') => {
    setSyncSettings({ conflictResolution });
  }, [setSyncSettings]);

  // Return the settings and mutation methods
  return {
    settings: settings as IntegrationSettings | undefined,
    isLoading,
    error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
    
    // Convenience methods
    setSyncFrequency,
    setSyncSettings,
    setApiSettings,
    setFields,
    setExcludedFields,
    setSyncDirection,
    setConflictResolution,
    
    // Computed properties for convenience
    syncFrequency: (settings as IntegrationSettings | undefined)?.syncFrequency,
    syncSettings: (settings as IntegrationSettings | undefined)?.syncSettings || {},
    webhookSettings: (settings as IntegrationSettings | undefined)?.webhookSettings || {},
    apiSettings: (settings as IntegrationSettings | undefined)?.apiSettings || {},
  };
}; 