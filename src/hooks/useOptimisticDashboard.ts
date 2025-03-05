/**
 * useOptimisticDashboard.ts
 * 
 * Enhanced versions of the dashboard hooks with optimistic updates.
 * These hooks provide a consistent way to implement optimistic updates
 * for the dashboard data.
 */
import { useOptimisticEntity, useOptimisticRelatedEntities } from './useOptimisticEntity';
import { useUserProfile } from './useDashboard';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

// Define our own options interface since it's not exported
interface OptimisticEntityOptions<TPath extends string, TMutationPath extends string, TInput> {
  queryPath: TPath;
  mutationPath: TMutationPath;
  entityId: string;
  idParamName?: string;
  successToast?: {
    title?: string;
    description: string;
  };
  errorToast?: {
    title?: string;
    description?: string;
  };
  showToasts?: boolean;
  transformInput?: (input: TInput) => Partial<unknown>;
}

// Type for organization members
interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  user: {
    name: string;
    email: string;
  };
}

// Type for integrations
interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
  organizationId: string;
}

// Type for mutation result
type MutationResult<TData = unknown, TInput = unknown> = {
  mutate: (input: TInput, options?: { onSuccess?: (data: TData) => void; onError?: (error: Error) => void }) => void;
  isPending: boolean;
};

/**
 * Hook for optimistic user profile updates
 */
export const useOptimisticUserProfile = () => {
  // Use the existing hook to get the profile data
  const { profile, isLoading, error, refetch } = useUserProfile();
  
  // Set up optimistic mutation for profile updates
  const updateMutation = useOptimisticEntity<'user.me', 'user.updateProfile', Record<string, unknown>>({
    queryPath: 'user.me',
    mutationPath: 'user.updateProfile',
    entityId: profile?.id || '',
    successToast: {
      description: 'Your profile has been updated successfully',
    },
    errorToast: {
      title: 'Profile Update Failed',
      description: 'There was an error updating your profile',
    },
  }) as MutationResult<unknown, Record<string, unknown>>;
  
  return {
    profile,
    isLoading,
    error,
    refetch,
    updateProfile: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};

/**
 * Hook for optimistic organization updates
 */
export const useOptimisticOrganization = (organizationId: string) => {
  const router = useRouter();
  
  // Organization details mutation
  const updateMutation = useOptimisticEntity<'organization.getById', 'organization.update', Record<string, unknown>>({
    queryPath: 'organization.getById',
    mutationPath: 'organization.update',
    entityId: organizationId,
    successToast: {
      description: 'Organization has been updated successfully',
    },
    errorToast: {
      title: 'Update Failed',
      description: 'There was an error updating the organization',
    },
  }) as MutationResult<unknown, Record<string, unknown>>;
  
  // Organization deletion options
  const deleteMutationOptions: OptimisticEntityOptions<'organization.getById', 'organization.delete', Record<string, unknown>> = {
    queryPath: 'organization.getById',
    mutationPath: 'organization.delete',
    entityId: organizationId,
    showToasts: false, // We'll handle toasts manually for delete
  };
  
  // Handle success and error with callbacks
  const deleteMutation = useOptimisticEntity<'organization.getById', 'organization.delete', Record<string, unknown>>(
    deleteMutationOptions
  ) as MutationResult<unknown, Record<string, unknown>>;
  
  // Add success and error handlers
  const deleteWithHandlers = (input: Record<string, unknown>) => {
    deleteMutation.mutate(input, {
      onSuccess: () => {
        toast({
          title: 'Organization Deleted',
          description: 'The organization has been deleted successfully',
        });
        
        // After successful deletion, navigate to the dashboard
        router.push('/dashboard');
      },
      
      onError: (error: Error) => {
        toast({
          title: 'Deletion Failed',
          description: error.message || 'There was an error deleting the organization',
          variant: 'destructive',
        });
      },
    });
  };
  
  return {
    updateOrganization: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteOrganization: deleteWithHandlers,
    isDeleting: deleteMutation.isPending,
  };
};

/**
 * Hook for optimistic organization member management
 */
export const useOptimisticOrganizationMembers = (organizationId: string) => {
  // Define types for member inputs
  interface AddMemberInput {
    invitedEmail?: string;
    userId?: string;
    role: string;
  }
  
  interface UpdateMemberInput {
    memberId?: string;
    userId?: string;
    role: string;
  }
  
  interface RemoveMemberInput {
    memberId?: string;
    userId?: string;
  }
  
  // Add member mutation
  const addMemberMutation = useOptimisticRelatedEntities<
    'organization.getMembers',
    'organization.inviteMember',
    OrganizationMember,
    AddMemberInput
  >({
    queryPath: 'organization.getMembers',
    mutationPath: 'organization.inviteMember',
    parentId: organizationId,
    getItemId: (item) => item.id,
    matchesItem: (item, input) => {
      if ('invitedEmail' in input && input.invitedEmail) {
        return item.user.email === input.invitedEmail;
      }
      if ('userId' in input && input.userId) {
        return item.userId === input.userId;
      }
      return false;
    },
    updateItem: (item, input) => ({
      ...item,
      role: input.role || item.role,
    }),
    createItem: (input) => ({
      id: `temp-${Date.now()}`, // Temporary ID until server responds
      userId: input.userId || '',
      organizationId,
      role: input.role,
      user: {
        name: '',
        email: input.invitedEmail || '',
      },
    }),
    successToast: {
      description: 'Member has been invited successfully',
    },
    errorToast: {
      title: 'Invitation Failed',
      description: 'There was an error sending the invitation',
    },
  }) as MutationResult<unknown, AddMemberInput>;
  
  // Update member role mutation
  const updateMemberMutation = useOptimisticRelatedEntities<
    'organization.getMembers',
    'organization.updateMember',
    OrganizationMember,
    UpdateMemberInput
  >({
    queryPath: 'organization.getMembers',
    mutationPath: 'organization.updateMember',
    parentId: organizationId,
    getItemId: (item) => item.id,
    matchesItem: (item, input) => {
      if ('memberId' in input) {
        return item.id === input.memberId;
      }
      if ('userId' in input && input.userId) {
        return item.userId === input.userId;
      }
      return false;
    },
    updateItem: (item, input) => ({
      ...item,
      role: input.role,
    }),
    successToast: {
      description: 'Member role has been updated successfully',
    },
    errorToast: {
      title: 'Update Failed',
      description: 'There was an error updating the member role',
    },
  }) as MutationResult<unknown, UpdateMemberInput>;
  
  // Remove member mutation
  const removeMemberMutation = useOptimisticRelatedEntities<
    'organization.getMembers',
    'organization.removeMember',
    OrganizationMember,
    RemoveMemberInput
  >({
    queryPath: 'organization.getMembers',
    mutationPath: 'organization.removeMember',
    parentId: organizationId,
    getItemId: (item) => item.id,
    matchesItem: (item, input) => {
      if ('memberId' in input) {
        return item.id === input.memberId;
      }
      if ('userId' in input && input.userId) {
        return item.userId === input.userId;
      }
      return false;
    },
    updateItem: (item) => item, // No updates for removal
    successToast: {
      description: 'Member has been removed successfully',
    },
    errorToast: {
      title: 'Removal Failed',
      description: 'There was an error removing the member',
    },
  }) as MutationResult<unknown, RemoveMemberInput>;
  
  return {
    inviteMember: addMemberMutation.mutate,
    isInviting: addMemberMutation.isPending,
    updateMember: updateMemberMutation.mutate,
    isUpdatingMember: updateMemberMutation.isPending,
    removeMember: removeMemberMutation.mutate,
    isRemovingMember: removeMemberMutation.isPending,
  };
};

/**
 * Hook for optimistic integration management
 */
export const useOptimisticIntegrations = (organizationId: string) => {
  // Define types for integration inputs
  interface ConnectIntegrationInput {
    type?: string;
    integrationId?: string;
  }
  
  interface DisconnectIntegrationInput {
    integrationId: string;
  }
  
  // Connect integration mutation
  const connectMutation = useOptimisticRelatedEntities<
    'integration.getByOrganization',
    'integration.connect',
    Integration,
    ConnectIntegrationInput
  >({
    queryPath: 'integration.getByOrganization',
    mutationPath: 'integration.connect',
    parentId: organizationId,
    getItemId: (item) => item.id,
    matchesItem: (item, input) => {
      if ('type' in input && input.type) {
        return item.type === input.type;
      }
      if ('integrationId' in input) {
        return item.id === input.integrationId;
      }
      return false;
    },
    updateItem: (item) => ({
      ...item,
      status: 'connected',
    }),
    createItem: (input) => ({
      id: `temp-${Date.now()}`, // Temporary ID until server responds
      name: input.type || 'New Integration',
      type: input.type || 'unknown',
      status: 'connecting', // Show as connecting initially
      organizationId,
    }),
    successToast: {
      description: 'Integration has been connected successfully',
    },
    errorToast: {
      title: 'Connection Failed',
      description: 'There was an error connecting the integration',
    },
  }) as MutationResult<unknown, ConnectIntegrationInput>;
  
  // Disconnect integration mutation
  const disconnectMutation = useOptimisticRelatedEntities<
    'integration.getByOrganization',
    'integration.disconnect',
    Integration,
    DisconnectIntegrationInput
  >({
    queryPath: 'integration.getByOrganization',
    mutationPath: 'integration.disconnect',
    parentId: organizationId,
    getItemId: (item) => item.id,
    matchesItem: (item, input) => {
      if ('integrationId' in input) {
        return item.id === input.integrationId;
      }
      return false;
    },
    updateItem: (item) => ({
      ...item,
      status: 'disconnected',
    }),
    successToast: {
      description: 'Integration has been disconnected successfully',
    },
    errorToast: {
      title: 'Disconnection Failed',
      description: 'There was an error disconnecting the integration',
    },
  }) as MutationResult<unknown, DisconnectIntegrationInput>;
  
  return {
    connectIntegration: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
    disconnectIntegration: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
  };
}; 