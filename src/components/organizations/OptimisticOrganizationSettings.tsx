/**
 * OptimisticOrganizationSettings.tsx
 * 
 * An example component that uses our optimistic UI hooks for organization settings.
 * This demonstrates how to use the optimistic UI hooks for form handling.
 */
'use client';;
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useOptimisticOrganization } from '@/hooks/useOptimisticDashboard';
import { useOrganization } from '@/hooks/useDashboard';
import { useTRPC } from '@/lib/trpc/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/components/ui/use-toast';
import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  website: z.string().url().optional().or(z.literal('')),
  billingEmail: z.string().email().optional().or(z.literal('')),
});

// Type for form values
type FormValues = z.infer<typeof formSchema>;

// Type for organization data
interface OrganizationData {
  id: string;
  name: string;
  website: string | null;
  billingEmail: string | null;
  // Add other fields as needed
}

export function OptimisticOrganizationSettings({ organizationId }: { organizationId: string }) {
  const trpc = useTRPC();
  const { organization, isLoading, error } = useOrganization(organizationId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Use our optimistic update hook
  const { deleteOrganization, isDeleting } = useOptimisticOrganization(organizationId);

  // Create update mutation with optimistic updates
  const updateMutation = useMutation(trpc.organization.update.mutationOptions({
    onMutate: async (data) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(trpc.organization.getById.queryFilter({ id: data.id }));
      
      // Get current data from cache
      const previousOrganization = queryClient.getQueryData(trpc.organization.getById.queryKey({ id: data.id }));
      
      // Optimistically update the cache
      queryClient.setQueryData(trpc.organization.getById.queryKey({ id: data.id }), (old) => {
        if (!old) return old;
        
        return {
          ...old,
          name: data.name || old.name,
          website: data.website || old.website,
          billingEmail: data.billingEmail || old.billingEmail,
        };
      });
      
      // Return context with previous data for rollback
      return { previousOrganization };
    },
    
    onSuccess: () => {
      // Show success toast
      toast({
        title: "Success",
        description: "Organization settings have been updated successfully",
      });
    },
    
    onError: (error, variables, context) => {
      // Rollback to previous data if there was an error
      if (context?.previousOrganization) {
        queryClient.setQueryData(
          trpc.organization.getById.queryKey({ id: variables.id }),
          context.previousOrganization
        );
      }
      
      console.error("Error updating organization:", error);
    },
    
    onSettled: () => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries(trpc.organization.getById.pathFilter());
    }
  }));

  // Create a form with react-hook-form directly
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      website: '',
      billingEmail: '',
    },
  });

  // Update form values when organization data is loaded
  useEffect(() => {
    if (organization) {
      const org = organization as unknown as OrganizationData;
      form.reset({
        name: org.name || '',
        website: org.website || '',
        billingEmail: org.billingEmail || '',
      });
    }
  }, [organization, form]);

  // Form submission handler
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Use the mutation to update the organization
      await updateMutation.mutateAsync({
        id: organizationId,
        ...data,
      });
      
      // Success toast is handled by the mutation's onSuccess callback
      console.log("Form submitted:", data);
    } catch (error) {
      console.error("Error updating organization:", error);
      
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to update organization settings",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrganization = () => {
    deleteOrganization({});
    setIsDialogOpen(false);
  };

  // If no organization data is available yet, show a loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="h-24 animate-pulse bg-muted rounded-md" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // If there was an error, show an error message
  if (error || !organization) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error?.message || "Could not load organization settings"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>
            Update your organization&apos;s profile information
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
                      <Input {...field} />
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
                      <Input {...field} placeholder="https://example.com" />
                    </FormControl>
                    <FormDescription>
                      Your organization&apos;s website (optional)
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
                      <Input {...field} placeholder="billing@example.com" />
                    </FormControl>
                    <FormDescription>
                      Email address for billing notifications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            Destructive actions that cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete Organization</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete the
                  organization and all associated data.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteOrganization}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Organization'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
} 