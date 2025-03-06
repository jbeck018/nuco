/**
 * OptimisticOrganizationSettings.tsx
 * 
 * An example component that uses our optimistic UI hooks for organization settings.
 * This demonstrates how to use the optimistic UI hooks for form handling.
 */
'use client';;
import { useState } from 'react';
import { z } from 'zod';
import { useOptimisticOrganization } from '@/hooks/useOptimisticDashboard';
import { useTRPCForm } from '@/hooks/useOptimisticForm';
import { useOrganization } from '@/hooks/useDashboard';
import { useTRPC } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useMutation } from "@tanstack/react-query";

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  website: z.string().url().optional().or(z.literal('')),
  billingEmail: z.string().email().optional().or(z.literal('')),
});

export function OptimisticOrganizationSettings({ organizationId }: { organizationId: string }) {
  const trpc = useTRPC();
  const { organization, isLoading, error } = useOrganization(organizationId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Use our optimistic update hook - moved outside of conditionals
  const { deleteOrganization, isDeleting } = useOptimisticOrganization(organizationId);

  // Get the mutation directly from tRPC
  const updateMutation = useMutation(trpc.organization.update.mutationOptions());

  // Use our form hook with the mutation - moved outside of conditionals
  const form = useTRPCForm(updateMutation, {
    defaultValues: {
      name: organization?.name || '',
      website: organization?.website || '',
      billingEmail: organization?.billingEmail || '',
    },
    validationSchema: formSchema,
    successToast: {
      description: "Organization settings have been updated successfully",
    },
  });

  // Form submission handler
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // The useTRPCForm hook handles the mutation
    // This is just a placeholder for any additional logic
    console.log("Form submitted:", data);
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
              
              <Button type="submit" disabled={form.isSubmitting}>
                {form.isSubmitting ? 'Saving...' : 'Save Changes'}
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