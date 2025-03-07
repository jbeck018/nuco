/**
 * Dashboard data hooks
 * 
 * This file contains custom hooks for fetching and managing dashboard data
 * using TanStack Query and tRPC.
 */
import { useTRPC } from '@/lib/trpc/trpc';

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook to fetch the current user's profile data
 */
export const useUserProfile = () => {
  const trpc = useTRPC();
  const { data, isLoading, error, refetch } = useQuery(trpc.user.me.queryOptions());

  return {
    profile: data,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook to update user profile with optimistic updates
 */
export const useUserProfileMutation = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const mutation = useMutation(trpc.user.updateProfile.mutationOptions({
    // Optimistically update the cache
    onMutate: async (newData) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries(trpc.user.me.pathFilter());
      
      // Get current data from cache
      const previousData = queryClient.getQueryData(trpc.user.me.queryKey());
      
      // Optimistically update the cache with new data
      queryClient.setQueryData(trpc.user.me.queryKey(), (old) => {
        if (!old) return old;
        return {
          ...old,
          ...newData,
        };
      });
      
      // Return previous data for rollback in case of failure
      return { previousData };
    },
    
    // If mutation fails, roll back to the previous value
    onError: (err, newData, context) => {
      queryClient.setQueryData(trpc.user.me.queryKey(), context?.previousData);
    },
    
    // After success or error, invalidate the query to ensure data consistency
    onSettled: () => {
      queryClient.invalidateQueries(trpc.user.me.pathFilter());
    },
  }));

  return mutation;
};

/**
 * Hook to fetch the user's organizations
 */
export const useUserOrganizations = () => {
  const trpc = useTRPC();
  const { data, isLoading, error, refetch } = useQuery(trpc.organization.getAll.queryOptions());

  return {
    organizations: data || [],
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook to fetch an organization's details by ID
 */
export const useOrganization = (organizationId: string | undefined) => {
  const trpc = useTRPC();
  const { data, isLoading, error, refetch } = useQuery(
    trpc.organization.getById.queryOptions(
      { id: organizationId || '' },
      { enabled: !!organizationId }
    )
  );

  return {
    organization: data,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook to fetch the members of an organization
 */
export const useOrganizationMembers = (organizationId: string | undefined) => {
  const trpc = useTRPC();
  const { data, isLoading, error, refetch } = useQuery(
    trpc.organization.getMembers.queryOptions(
      { id: organizationId || '' },
      { enabled: !!organizationId }
    )
  );

  return {
    members: data || [],
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook to fetch the user's integrations
 */
export const useUserIntegrations = (organizationId?: string) => {
  const trpc = useTRPC();
  const { data, isLoading, error, refetch } = useQuery(
    trpc.integration.getAll.queryOptions(organizationId ? { organizationId } : undefined)
  );

  return {
    integrations: data || [],
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook to fetch integration details by ID
 */
export const useIntegration = (integrationId: string | undefined) => {
  const trpc = useTRPC();
  const { data, isLoading, error, refetch } = useQuery(
    trpc.integration.getById.queryOptions(
      { id: integrationId || '' },
      { enabled: !!integrationId }
    )
  );

  return {
    integration: data,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook that returns combined dashboard stats
 */
export const useDashboardStats = () => {
  const { organizations } = useUserOrganizations();
  const { integrations } = useUserIntegrations();
  const organizationId = organizations?.[0]?.id;
  const { members } = useOrganizationMembers(organizationId);
  
  return {
    stats: {
      organizationsCount: organizations?.length || 0,
      membersCount: members?.length || 0,
      integrationsCount: integrations?.length || 0,
      activeIntegrationsCount: integrations?.filter(i => i.status === 'connected')?.length || 0,
    },
    isLoading: false, // We determine loading states from individual hooks if needed
  };
}; 