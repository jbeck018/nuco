/**
 * useUserPreferences.ts
 * 
 * A hook for managing user preferences with optimistic updates.
 * This hook provides a convenient interface for reading and updating user preferences.
 */
import { useTRPC } from '@/lib/trpc/client';
import { useSession } from 'next-auth/react';
import { toast } from '@/components/ui/use-toast';
import { useCallback } from 'react';

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

export type ThemePreference = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';

export interface Notifications {
  email: boolean;
  inApp: boolean;
  marketingEmails: boolean;
  slackMessages: boolean;
}

export interface Customization {
  accentColor?: string;
  fontSize?: FontSize;
  compactMode?: boolean;
}

/**
 * Hook for managing user preferences with optimistic updates
 */
export const useUserPreferences = () => {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const queryClient = useQueryClient();

  // Query for fetching user preferences
  const preferencesQuery = useQuery(trpc.metadata.getMyPreferences.queryOptions(
    undefined, // No input required
    {
      // Only run the query if we have a session
      enabled: !!userId,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      // Updated to match the tRPC queryKey format requirements
      // tRPC expects [path, input] format
      queryKey: ['metadata.getMyPreferences', undefined],
    }
  ));

  const { data: preferences, isLoading, error } = preferencesQuery;

  // Mutation for updating user preferences
  const updateMutation = useMutation(trpc.metadata.updateMyPreferences.mutationOptions({
    // When mutating, cancel any outgoing refetches
    // so they don't overwrite our optimistic update
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(trpc.metadata.getMyPreferences.pathFilter());
      
      // Get current data from cache
      const previousData = queryClient.getQueryData(trpc.metadata.getMyPreferences.queryKey());
      
      // Optimistically update the cache with merged data
      if (previousData) {
        queryClient.setQueryData(trpc.metadata.getMyPreferences.queryKey(), oldData => {
          if (!oldData) return oldData;
          
          // Deep merge handling for nested objects
          return {
            ...oldData,
            ...newData,
            // For nested objects, we need to handle special merging
            notifications: newData.notifications
              ? { ...oldData.notifications, ...newData.notifications }
              : oldData.notifications,
            customization: newData.customization
              ? { ...(oldData.customization || {}), ...newData.customization }
              : oldData.customization
          };
        });
      }
      
      // Return context with the previous data
      return { previousData };
    },
    
    onError: (error, newData, context) => {
      // If there was an error, roll back to previous data
      if (context?.previousData) {
        queryClient.setQueryData(trpc.metadata.getMyPreferences.queryKey(), context.previousData);
      }
      
      // Show error toast
      toast({
        title: 'Failed to update preferences',
        description: error.message,
        variant: 'destructive',
      });
    },
    
    onSuccess: () => {
      // Show success toast
      toast({
        title: 'Preferences updated',
        description: 'Your preferences have been updated successfully',
      });
    },
    
    onSettled: () => {
      // Invalidate the query to refetch fresh data
      queryClient.invalidateQueries(trpc.metadata.getMyPreferences.pathFilter());
    },
  }));

  // Convenience methods for updating specific preferences

  const updateTheme = useCallback(
    (theme: ThemePreference) => {
      return updateMutation.mutate({ theme });
    },
    [updateMutation]
  );

  const updateNotifications = useCallback(
    (notifications: Partial<Notifications>) => {
      if (!preferences?.notifications) return;
      
      updateMutation.mutate({
        notifications: {
          ...preferences.notifications,
          ...notifications,
        },
      });
    },
    [preferences?.notifications, updateMutation]
  );

  const updateCustomization = useCallback(
    (customization: Partial<Customization>) => {
      updateMutation.mutate({
        customization: {
          ...(preferences?.customization || {}),
          ...customization,
        },
      });
    },
    [preferences?.customization, updateMutation]
  );

  return {
    preferences,
    isLoading,
    error,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateTheme,
    updateNotifications,
    updateCustomization,
    
    // Computed properties for convenience
    theme: preferences?.theme as ThemePreference || 'system',
    notifications: preferences?.notifications,
    customization: preferences?.customization,
  };
}; 