/**
 * useOrganizationSettings.ts
 * 
 * A hook for managing organization settings with optimistic updates.
 * This hook provides a convenient interface for reading and updating organization settings.
 */
import { useTRPC } from '@/lib/trpc/trpc';
import { useCallback } from 'react';

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Types for organization settings
 */
export interface SlackSettings {
  webhookUrl?: string;
  notifyOnNewMembers?: boolean;
  notifyOnIntegrationChanges?: boolean;
  defaultChannels?: string[];
}

export interface AiSettings {
  defaultModel: string;
  maxTokensPerRequest: number;
  promptTemplates: Array<{ id: string; name: string; isDefault?: boolean }>;
  contextSettings?: {
    includeUserHistory: boolean;
    includeOrganizationData: boolean;
    contextWindowSize: number;
  };
}

export interface OrganizationSettings {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  defaultIntegrations: string[] | null;
  memberDefaultRole: "admin" | "member";
  slackSettings: SlackSettings | null;
  aiSettings: AiSettings | null;
}

/**
 * Hook to manage organization settings
 */
export const useOrganizationSettings = (organizationId: string) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Query for fetching organization settings
  const settingsQuery = useQuery(
    trpc.metadata.getOrganizationSettings.queryOptions(
      { organizationId },
      {
        enabled: !!organizationId,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      }
    )
  );

  const { data: settings, isLoading, error } = settingsQuery;

  // Mutation for updating organization settings
  const updateMutation = useMutation(trpc.metadata.updateOrganizationSettings.mutationOptions({
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(trpc.metadata.getOrganizationSettings.queryFilter({ organizationId }));
      
      // Get current data from cache
      const previousData = queryClient.getQueryData(trpc.metadata.getOrganizationSettings.queryKey({ organizationId }));
      
      // Optimistically update the cache with new data
      if (previousData) {
        queryClient.setQueryData(
          trpc.metadata.getOrganizationSettings.queryKey({ organizationId }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (input: any) => {
            // Cast input to OrganizationSettings
            const oldData = input as OrganizationSettings | undefined;
            if (!oldData) return oldData;
            
            // Create updated data by merging old and new
            return {
              ...oldData,
              ...newData,
              // Handle nested objects correctly
              slackSettings: newData.slackSettings 
                ? { ...(oldData.slackSettings || {}), ...newData.slackSettings } 
                : oldData.slackSettings,
              aiSettings: newData.aiSettings 
                ? { ...(oldData.aiSettings || {}), ...newData.aiSettings } 
                : oldData.aiSettings,
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
          trpc.metadata.getOrganizationSettings.queryKey({ organizationId }),
          context.previousData
        );
      }
    },
    
    // After success or error, invalidate the query to ensure data consistency
    onSettled: () => {
      queryClient.invalidateQueries(trpc.metadata.getOrganizationSettings.queryFilter({ organizationId }));
    },
  }));

  // Convenience method for updating member default role
  const setMemberDefaultRole = useCallback((role: "admin" | "member") => {
    updateMutation.mutate({
      organizationId,
      memberDefaultRole: role,
    });
  }, [organizationId, updateMutation]);

  // Convenience method for updating default integrations
  const setDefaultIntegrations = useCallback((integrations: string[]) => {
    updateMutation.mutate({
      organizationId,
      defaultIntegrations: integrations,
    });
  }, [organizationId, updateMutation]);

  // Convenience method for toggling a specific integration
  const toggleDefaultIntegration = useCallback((integrationId: string, enabled: boolean) => {
    const currentSettings = settings as OrganizationSettings | undefined;
    const currentIntegrations = currentSettings?.defaultIntegrations || [];
    const newIntegrations = enabled
      ? [...currentIntegrations, integrationId]
      : currentIntegrations.filter((id: string) => id !== integrationId);
    
    updateMutation.mutate({
      organizationId,
      defaultIntegrations: newIntegrations,
    });
  }, [organizationId, settings, updateMutation]);

  // Convenience method for updating Slack settings
  const setSlackSettings = useCallback((slackSettings: Partial<SlackSettings>) => {
    const currentSettings = settings as OrganizationSettings | undefined;
    updateMutation.mutate({
      organizationId,
      slackSettings: {
        ...(currentSettings?.slackSettings || {}),
        ...slackSettings,
      },
    });
  }, [organizationId, settings, updateMutation]);

  // Convenience method for updating Slack webhook URL
  const setSlackWebhookUrl = useCallback((webhookUrl: string) => {
    setSlackSettings({ webhookUrl });
  }, [setSlackSettings]);

  // Convenience method for updating Slack notification settings
  const setSlackNotifications = useCallback((notifications: {
    notifyOnNewMembers?: boolean;
    notifyOnIntegrationChanges?: boolean;
  }) => {
    setSlackSettings(notifications);
  }, [setSlackSettings]);

  // Convenience method for updating AI settings
  const setAiSettings = useCallback((aiSettings: Partial<AiSettings>) => {
    const currentSettings = settings as OrganizationSettings | undefined;
    const currentAiSettings = currentSettings?.aiSettings || {
      defaultModel: '',
      maxTokensPerRequest: 0,
      promptTemplates: []
    };
    
    updateMutation.mutate({
      organizationId,
      aiSettings: {
        ...currentAiSettings,
        ...aiSettings,
      },
    });
  }, [organizationId, settings, updateMutation]);

  return {
    // Data
    settings: settings as OrganizationSettings | undefined,
    isLoading,
    error,
    
    // Direct mutation access
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    
    // Convenience methods
    setMemberDefaultRole,
    setDefaultIntegrations,
    toggleDefaultIntegration,
    setSlackSettings,
    setSlackWebhookUrl,
    setSlackNotifications,
    setAiSettings,
    
    // Computed properties for convenience
    memberDefaultRole: (settings as OrganizationSettings | undefined)?.memberDefaultRole || 'member',
    defaultIntegrations: (settings as OrganizationSettings | undefined)?.defaultIntegrations || [],
    slackSettings: (settings as OrganizationSettings | undefined)?.slackSettings || null,
    aiSettings: (settings as OrganizationSettings | undefined)?.aiSettings || null,
    
    // Specific flag accessors
    hasSlackIntegration: ((settings as OrganizationSettings | undefined)?.defaultIntegrations || []).includes('slack'),
    hasHubspotIntegration: ((settings as OrganizationSettings | undefined)?.defaultIntegrations || []).includes('hubspot'),
  };
}; 