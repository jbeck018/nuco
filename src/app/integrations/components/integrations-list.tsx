/**
 * Integrations List Component
 * 
 * This component displays all available integrations and allows users to connect/disconnect them.
 * It uses the tRPC client to fetch integration data and manage integration operations.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { trpc } from '@/lib/trpc/client';
import { useOrganization } from '@/lib/organizations/context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { IntegrationType } from '@/lib/integrations';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { AppRouter } from '@/lib/trpc/router';

// Define the integration interface based on what's returned from the tRPC query
// Used as a reference for type safety and by getConnectedIntegration
interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  status: string; // Changed from 'connected' | 'disconnected' to string
  lastSynced: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Define the available integration interface
interface AvailableIntegration {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  documentationUrl: string;
}

/**
 * Integrations list component
 */
export function IntegrationsList() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState<'available' | 'connected'>('connected');
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch user's integrations, considering the organization context if available
  const { data: userIntegrations, isLoading: isLoadingUserIntegrations, refetch: refetchUserIntegrations } = 
    trpc.integration.getAll.useQuery(
      currentOrganization ? { organizationId: currentOrganization.id } : undefined
    );

  // Fetch available integration types
  const { data: availableIntegrations, isLoading: isLoadingAvailableIntegrations } = 
    trpc.integration.getAvailableTypes.useQuery();

  // Display organization context info if applicable
  useEffect(() => {
    if (currentOrganization) {
      console.log(`Loading integrations for organization: ${currentOrganization.name}`);
    }
  }, [currentOrganization]);

  const utils = trpc.useUtils();

  // Mutation for disconnecting an integration
  const disconnectIntegration = trpc.integration.disconnect.useMutation({
    // Optimistically update the cache
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await utils.integration.getAll.cancel();
      
      // Get current data from cache
      const previousData = utils.integration.getAll.getData(
        currentOrganization ? { organizationId: currentOrganization.id } : undefined
      );
      
      // Optimistically update the cache with disconnected status
      utils.integration.getAll.setData(
        currentOrganization ? { organizationId: currentOrganization.id } : undefined,
        (old) => {
          if (!old) return old;
          
          return old.map((integration) => {
            if (integration.id === id) {
              return {
                ...integration,
                status: 'disconnected',
                lastSynced: null,
              };
            }
            return integration;
          });
        }
      );
      
      // Close the disconnect dialog immediately for better UX
      setIsDisconnectDialogOpen(false);
      
      // Return previous data for rollback in case of failure
      return { previousData };
    },
    
    onSuccess: () => {
      toast({
        title: 'Integration disconnected',
        description: 'The integration has been disconnected successfully.',
      });
      refetchUserIntegrations();
      router.refresh();
    },
    
    // If mutation fails, roll back to the previous value
    onError: (error: TRPCClientErrorLike<AppRouter>, variables, context) => {
      // Restore the previous data
      if (context?.previousData) {
        utils.integration.getAll.setData(
          currentOrganization ? { organizationId: currentOrganization.id } : undefined,
          context.previousData
        );
      }
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect integration',
        variant: 'destructive',
      });
      
      // Reopen the dialog if there was an error
      if (variables.id) {
        setSelectedIntegration(variables.id);
        setIsDisconnectDialogOpen(true);
      }
    },
    
    // After success or error, invalidate the query to ensure data consistency
    onSettled: () => {
      utils.integration.getAll.invalidate();
    },
  });

  // Mutation for deleting an integration
  const deleteIntegration = trpc.integration.delete.useMutation({
    // Optimistically update the cache
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await utils.integration.getAll.cancel();
      
      // Get current data from cache
      const previousData = utils.integration.getAll.getData(
        currentOrganization ? { organizationId: currentOrganization.id } : undefined
      );
      
      // Optimistically update the cache by removing the deleted integration
      utils.integration.getAll.setData(
        currentOrganization ? { organizationId: currentOrganization.id } : undefined,
        (old) => {
          if (!old) return old;
          
          return old.filter(integration => integration.id !== id);
        }
      );
      
      // Close the delete dialog immediately for better UX
      setIsDeleteDialogOpen(false);
      
      // Return previous data for rollback in case of failure
      return { previousData };
    },
    
    onSuccess: () => {
      toast({
        title: 'Integration deleted',
        description: 'The integration has been deleted successfully.',
      });
      refetchUserIntegrations();
      router.refresh();
    },
    
    // If mutation fails, roll back to the previous value
    onError: (error: TRPCClientErrorLike<AppRouter>, variables, context) => {
      // Restore the previous data
      if (context?.previousData) {
        utils.integration.getAll.setData(
          currentOrganization ? { organizationId: currentOrganization.id } : undefined,
          context.previousData
        );
      }
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete integration',
        variant: 'destructive',
      });
      
      // Reopen the dialog if there was an error
      if (variables.id) {
        setSelectedIntegration(variables.id);
        setIsDeleteDialogOpen(true);
      }
    },
    
    // After success or error, invalidate the query to ensure data consistency
    onSettled: () => {
      utils.integration.getAll.invalidate();
    },
  });

  // Mutation for syncing an integration
  const syncIntegration = trpc.integration.sync.useMutation({
    // Optimistically update the cache
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await utils.integration.getAll.cancel();
      
      // Get current data from cache
      const previousData = utils.integration.getAll.getData(
        currentOrganization ? { organizationId: currentOrganization.id } : undefined
      );
      
      // Optimistically update the cache with syncing status
      utils.integration.getAll.setData(
        currentOrganization ? { organizationId: currentOrganization.id } : undefined,
        (old) => {
          if (!old) return old;
          
          return old.map(integration => {
            if (integration.id === id) {
              return {
                ...integration,
                status: 'syncing', // Show as syncing while the operation is in progress
              };
            }
            return integration;
          });
        }
      );
      
      // Return previous data for rollback in case of failure
      return { previousData };
    },
    
    onSuccess: () => {
      toast({
        title: 'Integration synced',
        description: 'The integration has been synced successfully.',
      });
      refetchUserIntegrations();
      router.refresh();
    },
    
    // If mutation fails, roll back to the previous value
    onError: (error: TRPCClientErrorLike<AppRouter>, variables, context) => {
      // Restore the previous data
      if (context?.previousData) {
        utils.integration.getAll.setData(
          currentOrganization ? { organizationId: currentOrganization.id } : undefined,
          context.previousData
        );
      }
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to sync integration',
        variant: 'destructive',
      });
    },
    
    // After success or error, invalidate the query to ensure data consistency
    onSettled: () => {
      utils.integration.getAll.invalidate();
    },
  });

  // Handle connect button click
  const handleConnect = (type: IntegrationType) => {
    let authUrl = '';
    
    switch (type) {
      case 'salesforce':
        authUrl = `/api/integrations/salesforce/authorize`;
        break;
      case 'hubspot':
        authUrl = `/api/integrations/hubspot/authorize`;
        break;
      case 'google':
        authUrl = `/api/integrations/google/authorize`;
        break;
      case 'slack':
        authUrl = `/api/integrations/slack/authorize`;
        break;
      default:
        toast({
          title: 'Error',
          description: `Unknown integration type: ${type}`,
          variant: 'destructive',
        });
        return;
    }
    
    // Redirect to the authorization URL
    window.location.href = authUrl;
  };

  // Handle disconnect button click
  const handleDisconnect = () => {
    if (selectedIntegration) {
      disconnectIntegration.mutate({ id: selectedIntegration });
    }
  };

  // Handle delete button click
  const handleDelete = () => {
    if (selectedIntegration) {
      deleteIntegration.mutate({ id: selectedIntegration });
    }
  };

  // Handle sync button click
  const handleSync = (id: string) => {
    syncIntegration.mutate({ id });
  };

  // Get connected integration by type
  const getConnectedIntegration = (type: IntegrationType): Integration | undefined => {
    return userIntegrations?.find((integration): integration is Integration => 
      integration.type === type && integration.status === 'connected'
    );
  };

  // Loading state
  if (isLoadingUserIntegrations || isLoadingAvailableIntegrations) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i: number) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="connected" value={activeTab} onValueChange={(value) => setActiveTab(value as 'available' | 'connected')}>
        <TabsList className="mb-4">
          <TabsTrigger value="connected">Connected</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
        </TabsList>

        <TabsContent value="connected" className="space-y-4">
          {userIntegrations?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                You don&apos;t have any connected integrations yet.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setActiveTab('available')}
              >
                Browse available integrations
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userIntegrations?.map((integration) => (
                <Card key={integration.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{integration.name}</CardTitle>
                      <Badge variant={integration.status === 'connected' ? 'default' : 'outline'}>
                        {integration.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {availableIntegrations?.find((i: AvailableIntegration) => i.type === integration.type)?.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>Last synced:</span>
                      <span>{integration.lastSynced ? new Date(integration.lastSynced).toLocaleString() : 'Never'}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedIntegration(integration.id);
                        setIsDisconnectDialogOpen(true);
                      }}
                      disabled={integration.status !== 'connected'}
                    >
                      Disconnect
                    </Button>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedIntegration(integration.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSync(integration.id)}
                        disabled={integration.status !== 'connected' || syncIntegration.isPending}
                      >
                        {syncIntegration.isPending && syncIntegration.variables?.id === integration.id ? (
                          <LoadingSpinner className="mr-2 h-4 w-4" />
                        ) : null}
                        Sync
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableIntegrations?.map((integration: AvailableIntegration) => {
              const connectedIntegration = getConnectedIntegration(integration.type);
              const isIntegrationConnected = !!connectedIntegration;

              return (
                <Card key={integration.type} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center">
                        <div className="w-6 h-6 mr-2 relative">
                          <Image
                            src={integration.icon}
                            alt={integration.name}
                            width={24}
                            height={24}
                            className="object-contain"
                          />
                        </div>
                        {integration.name}
                      </CardTitle>
                      {isIntegrationConnected && (
                        <Badge variant="default">Connected</Badge>
                      )}
                    </div>
                    <CardDescription>{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      {isIntegrationConnected ? (
                        <div className="text-muted-foreground">
                          Connected as: {connectedIntegration?.name}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          Connect to {integration.name} to access your data.
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <a
                      href={integration.documentationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Documentation
                    </a>
                    <Button
                      variant={isIntegrationConnected ? 'outline' : 'default'}
                      onClick={() => {
                        if (isIntegrationConnected) {
                          setSelectedIntegration(connectedIntegration?.id);
                          setIsDisconnectDialogOpen(true);
                        } else {
                          handleConnect(integration.type);
                        }
                      }}
                    >
                      {isIntegrationConnected ? 'Disconnect' : 'Connect'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Disconnect Dialog */}
      <Dialog open={isDisconnectDialogOpen} onOpenChange={setIsDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Integration</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect this integration? You can reconnect it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDisconnectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnectIntegration.isPending}
            >
              {disconnectIntegration.isPending && <LoadingSpinner className="mr-2 h-4 w-4" />}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Integration</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this integration? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteIntegration.isPending}
            >
              {deleteIntegration.isPending && <LoadingSpinner className="mr-2 h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 