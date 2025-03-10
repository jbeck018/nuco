/**
 * Integrations List Component
 * 
 * This component displays all available integrations and allows users to connect/disconnect them.
 * It uses the tRPC client to fetch integration data and manage integration operations.
 */

'use client';;
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTRPC } from '@/lib/trpc/trpc';
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
import { User } from 'lucide-react';
// Import company icons from react-icons
import { FaGoogle, FaSalesforce, FaSlack } from 'react-icons/fa';
import { SiHubspot } from 'react-icons/si';

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

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
  owner: {
    id: string;
    name: string;
    isCurrentUser: boolean;
  };
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
  const trpc = useTRPC();
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState<'available' | 'connected'>('connected');
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch user's integrations, considering the organization context if available
  const { data: userIntegrations, isLoading: isLoadingUserIntegrations, refetch: refetchUserIntegrations } = 
    useQuery(trpc.integration.getAll.queryOptions(
      currentOrganization ? { organizationId: currentOrganization.id } : undefined
    ));

  // Fetch available integration types
  const { data: availableIntegrations, isLoading: isLoadingAvailableIntegrations } = 
    useQuery(trpc.integration.getAvailableTypes.queryOptions());

  // Fetch authentication status for each integration type
  const { data: authStatus, isLoading: isLoadingAuthStatus } = 
    useQuery(trpc.integration.getAuthStatus.queryOptions());

  // Display organization context info if applicable
  useEffect(() => {
    if (currentOrganization) {
      console.log(`Loading integrations for organization: ${currentOrganization.name}`);
    } else {
      console.log('Loading personal integrations (no organization selected)');
    }
  }, [currentOrganization]);

  const queryClient = useQueryClient();

  // Mutation for disconnecting an integration
  const disconnectIntegration = useMutation(trpc.integration.disconnect.mutationOptions({
    // Optimistically update the cache
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries(trpc.integration.getAll.pathFilter());
      
      // Get current data from cache
      const previousData = queryClient.getQueryData(trpc.integration.getAll.queryKey(
        currentOrganization ? { organizationId: currentOrganization.id } : undefined
      ));
      
      // Optimistically update the cache with disconnected status
      queryClient.setQueryData(trpc.integration.getAll.queryKey(
        currentOrganization ? { organizationId: currentOrganization.id } : undefined
      ), (old) => {
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
      });
      
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
      queryClient.invalidateQueries(trpc.integration.getAuthStatus.pathFilter());
      router.refresh();
    },
    
    // If mutation fails, roll back to the previous value
    onError: (error: TRPCClientErrorLike<AppRouter>, variables, context) => {
      // Restore the previous data
      if (context?.previousData) {
        queryClient.setQueryData(trpc.integration.getAll.queryKey(
          currentOrganization ? { organizationId: currentOrganization.id } : undefined
        ), context.previousData);
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
      queryClient.invalidateQueries(trpc.integration.getAll.pathFilter());
    },
  }));

  // Mutation for deleting an integration
  const deleteIntegration = useMutation(trpc.integration.delete.mutationOptions({
    // Optimistically update the cache
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries(trpc.integration.getAll.pathFilter());
      
      // Get current data from cache
      const previousData = queryClient.getQueryData(trpc.integration.getAll.queryKey(
        currentOrganization ? { organizationId: currentOrganization.id } : undefined
      ));
      
      // Optimistically update the cache by removing the deleted integration
      queryClient.setQueryData(trpc.integration.getAll.queryKey(
        currentOrganization ? { organizationId: currentOrganization.id } : undefined
      ), (old) => {
        if (!old) return old;
        
        return old.filter(integration => integration.id !== id);
      });
      
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
      queryClient.invalidateQueries(trpc.integration.getAuthStatus.pathFilter());
      router.refresh();
    },
    
    // If mutation fails, roll back to the previous value
    onError: (error: TRPCClientErrorLike<AppRouter>, variables, context) => {
      // Restore the previous data
      if (context?.previousData) {
        queryClient.setQueryData(trpc.integration.getAll.queryKey(
          currentOrganization ? { organizationId: currentOrganization.id } : undefined
        ), context.previousData);
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
      queryClient.invalidateQueries(trpc.integration.getAll.pathFilter());
    },
  }));

  // Handle connect button click
  const handleConnect = (type: IntegrationType) => {
    // Use NextAuth's signIn function for OAuth flow
    signIn(type, { 
      callbackUrl: `/dashboard/integrations?type=${type}`,
      redirect: true
    });
  };

  // Handle disconnect button click
  const handleDisconnect = () => {
    if (selectedIntegration) {
      const integration = userIntegrations?.find(i => i.id === selectedIntegration);
      
      if (integration) {
        // For OAuth-based integrations, we should revoke the token through NextAuth
        // This is a hybrid approach that works with both NextAuth and custom integrations
        if (integration.type === 'google' || integration.type === 'salesforce' || 
            integration.type === 'hubspot' || integration.type === 'slack') {
          
          // First, disconnect using tRPC mutation for database updates
          disconnectIntegration.mutate({ id: selectedIntegration }, {
            onSuccess: () => {
              // Close dialog
              setIsDisconnectDialogOpen(false);
              
              // Show success message
              toast({
                title: 'Integration disconnected',
                description: 'The integration has been disconnected successfully.',
              });
              
              // Refresh data
              refetchUserIntegrations();
              queryClient.invalidateQueries(trpc.integration.getAuthStatus.pathFilter());
              router.refresh();
            }
          });
        } else {
          // For non-OAuth integrations, just use the existing mutation
          disconnectIntegration.mutate({ id: selectedIntegration });
        }
      }
    }
  };

  // Handle delete button click
  const handleDelete = () => {
    if (selectedIntegration) {
      deleteIntegration.mutate({ id: selectedIntegration });
    }
  };

  // Get a connected integration by type
  const getConnectedIntegration = (type: IntegrationType): Integration | undefined => {
    return userIntegrations?.find((integration): integration is Integration => 
      integration.type === type && integration.status === 'connected'
    );
  };

  // Check if a user is authenticated with a provider
  const isAuthenticatedWithProvider = (type: IntegrationType): boolean => {
    if (!authStatus) return false;
    return authStatus[type]?.isAuthenticated || false;
  };

  // Generate documentation URL for an integration type
  const getDocumentationUrl = (type: IntegrationType): string => {
    switch (type) {
      case 'salesforce':
        return 'https://developer.salesforce.com/docs';
      case 'hubspot':
        return 'https://developers.hubspot.com/docs';
      case 'google':
        return 'https://developers.google.com/workspace';
      case 'slack':
        return 'https://api.slack.com/docs';
      default:
        return '#';
    }
  };

  // Helper function to get the appropriate icon for an integration type
  const getIntegrationIcon = (type: IntegrationType) => {
    switch (type) {
      case 'salesforce':
        return <FaSalesforce className="h-5 w-5 text-blue-600" />;
      case 'hubspot':
        return <SiHubspot className="h-5 w-5 text-orange-500" />;
      case 'google':
        return <FaGoogle className="h-5 w-5 text-red-500" />;
      case 'slack':
        return <FaSlack className="h-5 w-5 text-purple-500" />;
      default:
        return <FaGoogle className="h-5 w-5" />;
    }
  };

  // Loading state
  if (isLoadingUserIntegrations || isLoadingAvailableIntegrations || isLoadingAuthStatus) {
    return (
      <div className="grid grid-cols-1 gap-6">
        {[1, 2, 3].map((i: number) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-40" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-28" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  // Count connected integrations
  const connectedCount = userIntegrations?.length || 0;

  const availableConnections = availableIntegrations?.filter(i => !userIntegrations?.some(ui => ui.type === i.type))

  return (
    <div className="space-y-6">
      <Tabs defaultValue="connected" value={activeTab} onValueChange={(value) => setActiveTab(value as 'available' | 'connected')}>
        <TabsList className="mb-4">
          <TabsTrigger value="connected">Connected ({connectedCount})</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
        </TabsList>

        <TabsContent value="connected" className="space-y-4">
          {connectedCount === 0 ? (
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
            <div className="grid grid-cols-1 gap-6">
              {userIntegrations?.map((integration) => {
                const connectedIntegration = getConnectedIntegration(integration.type);
                
                return (
                  <Card key={integration.type} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <div className="flex-shrink-0">
                            {getIntegrationIcon(integration.type)}
                          </div>
                          <span className="truncate">{integration.name}</span>
                        </CardTitle>
                        <Badge variant="default">Connected</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm space-y-2">
                        <div className="text-muted-foreground">
                          {connectedIntegration ? (
                            <>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>
                                  {connectedIntegration.owner?.isCurrentUser 
                                    ? 'Connected by you' 
                                    : `Connected by ${connectedIntegration.owner?.name || 'Unknown'}`}
                                </span>
                              </div>
                              <div className="mt-1">
                                Last synced: {connectedIntegration.lastSynced 
                                  ? new Date(connectedIntegration.lastSynced).toLocaleString() 
                                  : 'Never'}
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>Connected via OAuth</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <a
                        href={getDocumentationUrl(integration.type)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Documentation
                      </a>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (connectedIntegration) {
                            setSelectedIntegration(connectedIntegration.id);
                            setIsDisconnectDialogOpen(true);
                          } else {
                            // For OAuth integrations, we need to revoke access
                            // This would typically be handled by the auth provider
                            toast({
                              title: 'NextAuth Integration',
                              description: 'To disconnect this NextAuth integration, please visit your account settings.',
                            });
                          }
                        }}
                      >
                        Disconnect
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            {(availableConnections || []).map((integration: AvailableIntegration) => {
              const isConnected = isAuthenticatedWithProvider(integration.type);
              const connectedIntegration = getConnectedIntegration(integration.type);

              return (
                <Card key={integration.type} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="flex-shrink-0">
                          {getIntegrationIcon(integration.type)}
                        </div>
                        <span className="truncate">{integration.name}</span>
                      </CardTitle>
                      {isConnected && <Badge variant="default">Connected</Badge>}
                    </div>
                    <CardDescription className="line-clamp-2">{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-2">
                      {isConnected ? (
                        <div className="text-muted-foreground">
                          {connectedIntegration ? (
                            <>Connected as: {connectedIntegration.name}</>
                          ) : (
                            <>Connected via NextAuth</>
                          )}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          Connect to {integration.name} using NextAuth to access your data.
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <a
                      href={getDocumentationUrl(integration.type)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Documentation
                    </a>
                    <Button
                      variant={isConnected ? 'outline' : 'default'}
                      onClick={() => {
                        if (isConnected) {
                          if (connectedIntegration) {
                            setSelectedIntegration(connectedIntegration.id);
                            setIsDisconnectDialogOpen(true);
                          } else {
                            // For OAuth integrations, we need to revoke access
                            // This would typically be handled by the auth provider
                            toast({
                              title: 'NextAuth Integration',
                              description: 'To disconnect this NextAuth integration, please visit your account settings.',
                            });
                          }
                        } else {
                          handleConnect(integration.type);
                        }
                      }}
                    >
                      {isConnected ? 'Disconnect' : 'Connect'}
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