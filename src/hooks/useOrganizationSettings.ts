/**
 * useOrganizationSettings.ts
 * 
 * A hook for managing organization settings with optimistic updates.
 * This hook provides a convenient interface for reading and updating organization settings.
 */
import { trpc } from '@/lib/trpc/client';
import { toast } from '@/components/ui/use-toast';
import { useCallback } from 'react';

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
  defaultModel?: string;
  maxTokensPerRequest?: number;
  promptTemplates?: Array<{ id: string; name: string; isDefault?: boolean }>;
}

export interface OrganizationSettings {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  defaultIntegrations: string[] | null;
  memberDefaultRole: string;
  slackSettings: SlackSettings | null;
  aiSettings: AiSettings | null;
}

/**
 * Hook to manage organization settings
 */
export const useOrganizationSettings = (organizationId: string) => {
  const utils = trpc.useContext();
  
  // Query for fetching organization settings
  const settingsQuery = trpc.metadata.getOrganizationSettings.useQuery(
    { organizationId },
    {
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      queryKey: ['metadata.getOrganizationSettings', { organizationId }],
    }
  );
  
  const { data: settings, isLoading, error } = settingsQuery;
  
  // Mutation for updating organization settings
  const updateMutation = trpc.metadata.updateOrganizationSettings.useMutation({
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await utils.metadata.getOrganizationSettings.cancel({ organizationId });
      
      // Get current data from cache
      const previousData = utils.metadata.getOrganizationSettings.getData({ organizationId });
      
      // Optimistically update the cache with new data
      if (previousData) {
        utils.metadata.getOrganizationSettings.setData(
          { organizationId }, 
          oldData => {
            if (!oldData) return oldData;
            
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
      
      // Return context with previous data for rollback in case of failure
      return { previousData };
    },
    
    onError: (err, _, context) => {
      // Rollback to previous data if there was an error
      if (context?.previousData) {
        utils.metadata.getOrganizationSettings.setData(
          { organizationId }, 
          context.previousData
        );
      }
      
      // Show error toast
      toast({
        title: 'Failed to update settings',
        description: err.message || 'Please try again later',
        variant: 'destructive',
      });
    },
    
    onSuccess: () => {
      // Show success toast
      toast({
        title: 'Settings updated',
        description: 'Organization settings have been saved',
      });
    },
    
    onSettled: () => {
      // Invalidate the query to refetch fresh data
      utils.metadata.getOrganizationSettings.invalidate({ organizationId });
    },
  });
  
  // Convenience method for updating member default role
  const setMemberDefaultRole = useCallback((memberDefaultRole: 'member' | 'admin') => {
    updateMutation.mutate({
      organizationId,
      memberDefaultRole,
    });
  }, [organizationId, updateMutation]);
  
  // Convenience method for updating default integrations
  const setDefaultIntegrations = useCallback((defaultIntegrations: string[]) => {
    updateMutation.mutate({
      organizationId,
      defaultIntegrations,
    });
  }, [organizationId, updateMutation]);
  
  // Convenience method for toggling a specific integration
  const toggleDefaultIntegration = useCallback((integrationId: string, enabled: boolean) => {
    const currentIntegrations = settings?.defaultIntegrations || [];
    const newIntegrations = enabled
      ? [...currentIntegrations, integrationId]
      : currentIntegrations.filter(id => id !== integrationId);
    
    updateMutation.mutate({
      organizationId,
      defaultIntegrations: newIntegrations,
    });
  }, [organizationId, settings?.defaultIntegrations, updateMutation]);
  
  // Convenience method for updating Slack settings
  const setSlackSettings = useCallback((slackSettings: Partial<SlackSettings>) => {
    updateMutation.mutate({
      organizationId,
      slackSettings: {
        ...(settings?.slackSettings || {}),
        ...slackSettings,
      },
    });
  }, [organizationId, settings?.slackSettings, updateMutation]);
  
  // Convenience method for updating Slack webhook URL
  const setSlackWebhookUrl = useCallback((webhookUrl: string) => {
    setSlackSettings({ webhookUrl });
  }, [setSlackSettings]);
  
  // Convenience method for enabling/disabling Slack notifications
  const setSlackNotifications = useCallback((config: { 
    notifyOnNewMembers?: boolean; 
    notifyOnIntegrationChanges?: boolean;
  }) => {
    setSlackSettings(config);
  }, [setSlackSettings]);
  
  // Convenience method for updating AI settings
  const setAiSettings = useCallback((aiSettings: Partial<AiSettings>) => {
    updateMutation.mutate({
      organizationId,
      aiSettings: {
        ...(settings?.aiSettings || {}),
        ...aiSettings,
      },
    });
  }, [organizationId, settings?.aiSettings, updateMutation]);
  
  return {
    // Data
    settings,
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
    memberDefaultRole: settings?.memberDefaultRole || 'member',
    defaultIntegrations: settings?.defaultIntegrations || [],
    slackSettings: settings?.slackSettings || null,
    aiSettings: settings?.aiSettings || null,
    
    // Specific flag accessors
    hasSlackIntegration: (settings?.defaultIntegrations || []).includes('slack'),
    hasHubspotIntegration: (settings?.defaultIntegrations || []).includes('hubspot'),
  };
}; 