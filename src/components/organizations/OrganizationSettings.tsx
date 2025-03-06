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

import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

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
  const router = useRouter();
  const queryClient = useQueryClient();

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>
            Manage your organization&apos;s profile and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
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

              <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
                {isSubmitting || updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
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