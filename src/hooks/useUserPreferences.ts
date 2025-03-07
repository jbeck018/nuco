/**
 * useUserPreferences.ts
 * 
 * A hook for managing user preferences with optimistic updates.
 * This hook provides a convenient interface for reading and updating user preferences.
 */
import { useTRPC } from '@/lib/trpc/trpc';
import { useSession } from 'next-auth/react';
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

export interface UserPreferences {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  theme: ThemePreference;
  notifications: Notifications;
  customization: Customization;
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
  const preferencesQuery = useQuery(
    trpc.metadata.getMyPreferences.queryOptions(
      undefined, // No input required
      {
        // Only run the query if we have a session
        enabled: !!userId,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      }
    )
  );

  const { data: preferences, isLoading, error } = preferencesQuery;

  // Mutation for updating user preferences
  const updateMutation = useMutation(trpc.metadata.updateMyPreferences.mutationOptions({
    // When mutating, cancel any outgoing refetches
    // so they don't overwrite our optimistic update
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(trpc.metadata.getMyPreferences.pathFilter());
      
      // Get current data from cache
      const previousData = queryClient.getQueryData(trpc.metadata.getMyPreferences.queryKey());
      
      // Optimistically update the cache with new data
      queryClient.setQueryData(trpc.metadata.getMyPreferences.queryKey(), oldData => {
        if (!oldData) return oldData;
        
        // Create updated data by merging old and new
        return {
          ...oldData,
          ...newData,
          // Handle nested objects correctly
          notifications: newData.notifications 
            ? { ...(oldData.notifications || {}), ...newData.notifications } 
            : oldData.notifications,
          customization: newData.customization 
            ? { ...(oldData.customization || {}), ...newData.customization } 
            : oldData.customization,
        };
      });
      
      return { previousData };
    },
    
    // If the mutation fails, roll back to the previous value
    onError: (err, newData, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(trpc.metadata.getMyPreferences.queryKey(), context.previousData);
      }
    },
    
    // After success or error, invalidate the query to ensure data consistency
    onSettled: () => {
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
      const typedPreferences = preferences as UserPreferences | undefined;
      if (!typedPreferences?.notifications) return;
      
      updateMutation.mutate({
        notifications: {
          ...typedPreferences.notifications,
          ...notifications,
        },
      });
    },
    [preferences, updateMutation]
  );

  const updateCustomization = useCallback(
    (customization: Partial<Customization>) => {
      const typedPreferences = preferences as UserPreferences | undefined;
      updateMutation.mutate({
        customization: {
          ...(typedPreferences?.customization || {}),
          ...customization,
        },
      });
    },
    [preferences, updateMutation]
  );

  return {
    preferences: preferences as UserPreferences | undefined,
    isLoading,
    error,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateTheme,
    updateNotifications,
    updateCustomization,
    
    // Computed properties for convenience
    theme: (preferences as UserPreferences | undefined)?.theme || 'system',
    notifications: (preferences as UserPreferences | undefined)?.notifications,
    customization: (preferences as UserPreferences | undefined)?.customization,
  };
}; 