/**
 * Dashboard data hooks
 * 
 * This file contains custom hooks for fetching and managing dashboard data
 * using TanStack Query and tRPC.
 */
import { trpc } from '@/lib/trpc/client';

/**
 * Hook to fetch the current user's profile data
 */
export const useUserProfile = () => {
  const { data, isLoading, error, refetch } = trpc.user.me.useQuery();
  
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
  const utils = trpc.useContext();
  
  const mutation = trpc.user.updateProfile.useMutation({
    // Optimistically update the cache
    onMutate: async (newData) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await utils.user.me.cancel();
      
      // Get current data from cache
      const previousData = utils.user.me.getData();
      
      // Optimistically update the cache with new data
      utils.user.me.setData(undefined, (old) => {
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
      utils.user.me.setData(undefined, context?.previousData);
    },
    
    // After success or error, invalidate the query to ensure data consistency
    onSettled: () => {
      utils.user.me.invalidate();
    },
  });
  
  return mutation;
};

/**
 * Hook to fetch the user's organizations
 */
export const useUserOrganizations = () => {
  const { data, isLoading, error, refetch } = trpc.organization.getAll.useQuery();
  
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
  const { data, isLoading, error, refetch } = organizationId ? 
    trpc.organization.getById.useQuery({ id: organizationId }) : 
    { data: undefined, isLoading: false, error: null, refetch: () => Promise.resolve() };
  
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
  const { data, isLoading, error, refetch } = organizationId ? 
    trpc.organization.getMembers.useQuery({ id: organizationId }) : 
    { data: undefined, isLoading: false, error: null, refetch: () => Promise.resolve() };
  
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
  const { data, isLoading, error, refetch } = trpc.integration.getAll.useQuery(
    organizationId ? { organizationId } : undefined
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
  const { data, isLoading, error, refetch } = integrationId ?
    trpc.integration.getById.useQuery({ id: integrationId }) :
    { data: undefined, isLoading: false, error: null, refetch: () => Promise.resolve() };
  
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