"use client";;
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/components/ui/use-toast";
import { useTRPC } from "@/lib/trpc/trpc";
import { useOrganization } from "@/lib/organizations/context";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { ModelSelector } from '@/components/ai/ModelSelector';
import { AiSettings } from '@/lib/db/types/metadata-types';

const formSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
  website: z.string().url().optional().or(z.literal("")),
  billingEmail: z.string().email().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export function OrganizationSettings() {
  const trpc = useTRPC();
  const { currentOrganization, refreshOrganizations } = useOrganization();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdatingAiSettings, setIsUpdatingAiSettings] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch organization settings
  const { data: orgSettings, isLoading: isLoadingSettings } = useQuery({
    ...trpc.metadata.getOrganizationSettings.queryOptions({ 
      organizationId: currentOrganization?.id || '' 
    }),
    enabled: !!currentOrganization?.id
  });

  const updateMutation = useMutation(trpc.organization.update.mutationOptions({
    onMutate: async (data) => {
      await queryClient.cancelQueries(trpc.organization.getById.queryFilter({ id: data.id }));
      await queryClient.cancelQueries(trpc.organization.getAll.pathFilter());
      
      const previousOrganization = queryClient.getQueryData(trpc.organization.getById.queryKey({ id: data.id }));
      
      queryClient.setQueryData(trpc.organization.getById.queryKey({ id: data.id }), (old) => {
        if (!old) return old;
        
        return {
          ...old,
          name: data.name || old.name,
          website: data.website || old.website,
          billingEmail: data.billingEmail || old.billingEmail,
        };
      });
      
      queryClient.setQueryData(trpc.organization.getAll.queryKey(), (old) => {
        if (!old) return old;
        
        return old.map(org => {
          if (org.id === data.id) {
            return {
              ...org,
              name: data.name || org.name,
              website: data.website || org.website,
              billingEmail: data.billingEmail || org.billingEmail,
            };
          }
          return org;
        });
      });
      
      return { previousOrganization };
    },
    
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Organization settings updated",
      });
    },
    
    onError: (error, variables, context) => {
      if (context?.previousOrganization) {
        queryClient.setQueryData(
          trpc.organization.getById.queryKey({ id: variables.id }),
          context.previousOrganization
        );
        
        queryClient.setQueryData(trpc.organization.getAll.queryKey(), (old) => {
          if (!old) return old;
          
          return old.map(org => {
            if (org.id === variables.id) {
              return {
                ...org,
                ...context.previousOrganization,
              };
            }
            return org;
          });
        });
      }
      
      console.error("Failed to update organization:", error);
      toast({
        title: "Error",
        description: "Failed to update organization settings",
        variant: "destructive",
      });
    },
    
    onSettled: async (_, __, variables) => {
      await queryClient.invalidateQueries(trpc.organization.getById.queryFilter({ id: variables.id }));
      await queryClient.invalidateQueries(trpc.organization.getAll.pathFilter());
      await refreshOrganizations();
    }
  }));

  // Add mutation for updating organization AI settings
  const updateOrgSettingsMutation = useMutation(trpc.metadata.updateOrganizationSettings.mutationOptions({
    onMutate: async () => {
      setIsUpdatingAiSettings(true);
      if (currentOrganization?.id) {
        await queryClient.cancelQueries(trpc.metadata.getOrganizationSettings.queryFilter({ organizationId: currentOrganization.id }));
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization AI settings updated",
      });
    },
    onError: (error) => {
      console.error("Failed to update organization AI settings:", error);
      toast({
        title: "Error",
        description: "Failed to update organization AI settings",
        variant: "destructive",
      });
    },
    onSettled: async () => {
      setIsUpdatingAiSettings(false);
      if (currentOrganization?.id) {
        await queryClient.invalidateQueries(trpc.metadata.getOrganizationSettings.queryFilter({ organizationId: currentOrganization.id }));
      }
    }
  }));

  const deleteMutation = useMutation(trpc.organization.delete.mutationOptions({
    onMutate: async ({ id }) => {
      setIsDeleting(true);
      setIsDialogOpen(false);
      
      await queryClient.cancelQueries(trpc.organization.getById.queryFilter({ id }));
      await queryClient.cancelQueries(trpc.organization.getAll.pathFilter());
      
      const previousOrganization = queryClient.getQueryData(trpc.organization.getById.queryKey({ id }));
      const previousOrganizations = queryClient.getQueryData(trpc.organization.getAll.queryKey());
      
      queryClient.setQueryData(trpc.organization.getAll.queryKey(), (old) => {
        if (!old) return old;
        return old.filter(org => org.id !== id);
      });
      
      queryClient.setQueryData(trpc.organization.getById.queryKey({ id }), () => undefined);
      
      return { previousOrganization, previousOrganizations };
    },
    
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Organization deleted",
      });
      
      await refreshOrganizations();
      router.push("/");
    },
    
    onError: (error, variables, context) => {
      if (context?.previousOrganization) {
        queryClient.setQueryData(
          trpc.organization.getById.queryKey({ id: variables.id }),
          context.previousOrganization
        );
      }
      
      if (context?.previousOrganizations) {
        queryClient.setQueryData(trpc.organization.getAll.queryKey(), context.previousOrganizations);
      }
      
      console.error("Failed to delete organization:", error);
      toast({
        title: "Error",
        description: "Failed to delete organization",
        variant: "destructive",
      });
      
      setIsDialogOpen(true);
    },
    
    onSettled: () => {
      setIsDeleting(false);
      
      queryClient.invalidateQueries(trpc.organization.getById.pathFilter());
      queryClient.invalidateQueries(trpc.organization.getAll.pathFilter());
    }
  }));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: currentOrganization?.name || "",
      website: currentOrganization?.website || "",
      billingEmail: currentOrganization?.billingEmail || "",
    },
  });

  const { isSubmitting } = form.formState;

  // Update form values when currentOrganization changes
  useEffect(() => {
    if (currentOrganization) {
      form.reset({
        name: currentOrganization.name,
        website: currentOrganization.website || "",
        billingEmail: currentOrganization.billingEmail || "",
      });
    }
  }, [currentOrganization, form]);

  const onSubmit = async (data: FormValues) => {
    if (!currentOrganization) return;
    
    // Show immediate feedback toast
    const loadingToast = toast({
      title: "Saving changes...",
      description: "Your organization settings are being updated",
    });
    
    updateMutation.mutate({
      id: currentOrganization.id,
      ...data,
    }, {
      onSuccess: () => {
        // Dismiss the loading toast
        loadingToast.dismiss();
      },
      onError: () => {
        // Dismiss the loading toast
        loadingToast.dismiss();
      }
    });
  };

  const handleDeleteOrganization = () => {
    if (!currentOrganization) return;
    
    setIsDeleting(true);
    deleteMutation.mutate({ id: currentOrganization.id });
  };

  // Handle model selection for organization
  const handleModelChange = async (modelId: string) => {
    if (!currentOrganization?.id) return;
    
    // Create default AI settings if they don't exist
    const defaultAiSettings: AiSettings = {
      defaultModel: modelId,
      maxTokensPerRequest: 2000,
      promptTemplates: [],
      contextSettings: {
        includeUserHistory: true,
        includeOrganizationData: true,
        contextWindowSize: 10,
      }
    };
    
    // Use existing settings if available
    const aiSettings = orgSettings?.aiSettings 
      ? { ...orgSettings.aiSettings, defaultModel: modelId }
      : defaultAiSettings;
    
    updateOrgSettingsMutation.mutate({
      organizationId: currentOrganization.id,
      aiSettings
    });
  };

  if (!currentOrganization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>No organization selected</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 h-full overflow-y-auto overflow-x-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Manage your organization&apos;s basic information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter organization name" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is your organization&apos;s display name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your organization&apos;s website (optional).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="billingEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Email</FormLabel>
                    <FormControl>
                      <Input placeholder="billing@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Email address for billing notifications (optional).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
      
      {/* AI Model Settings */}
      <Card>
        <CardHeader>
          <CardTitle>AI Model Settings</CardTitle>
          <CardDescription>
            Configure the default AI model for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Default AI Model</h3>
            <p className="text-sm text-muted-foreground">
              Select the default AI model to use for all chats in your organization.
              Users can override this setting in individual chats.
            </p>
            <div className="pt-2">
              <div className="w-full max-w-[300px]">
                {isLoadingSettings ? (
                  <div className="h-10 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm">Loading...</div>
                ) : (
                  <ModelSelector 
                    isOrganizationSetting={true} 
                    initialModelId={orgSettings?.aiSettings?.defaultModel}
                    onModelChange={handleModelChange}
                    disabled={isUpdatingAiSettings}
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete this organization and all its data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. This will permanently delete the
            organization, remove all members, and delete all associated data.
          </p>
        </CardContent>
        <CardFooter>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete Organization"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete the
                  organization &quot;{currentOrganization.name}&quot; and remove all data
                  associated with it.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteOrganization}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
} 