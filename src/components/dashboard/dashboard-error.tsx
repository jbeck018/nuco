'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/trpc';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';

/**
 * Error component for the dashboard
 * This is a client component to allow for the onClick handler
 */
export function DashboardError() {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // TRPC mutations
  const createOrganization = useMutation(trpc.organization.create.mutationOptions({
    onSuccess: (data) => {
      setIsCreating(false);
      setIsCreateDialogOpen(false);
      // Navigate to the new organization
      window.location.reload();
    },
    onError: (error) => {
      setIsCreating(false);
      console.error('Failed to create organization:', error);
    }
  }));

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    
    setIsCreating(true);
    try {
      await createOrganization.mutateAsync({
        name: orgName.trim()
      });
    } catch (error) {
      setIsCreating(false);
      console.error('Failed to create organization:', error);
    }
  };

  return (
    <>
      <div className="rounded-lg border border-destructive p-6 my-6">
        <h3 className="text-lg font-medium text-destructive">Organization Not Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t have an active organization or the organization you were using no longer exists.
          Please create a new organization to continue.
        </p>
        <div className="mt-4 flex gap-3">
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            variant="default"
          >
            Create Organization
          </Button>
          <Button 
            onClick={() => router.push('/settings/organizations')}
            variant="outline"
          >
            Manage Organizations
          </Button>
        </div>
      </div>

      {/* Create Organization Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Create a new organization to get started with Nuco.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                placeholder="My Organization"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={isCreating}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrg}
              disabled={!orgName.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}