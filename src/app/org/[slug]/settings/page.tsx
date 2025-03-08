"use client";

export const runtime = 'edge';

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizationSettings } from "@/components/organizations/OrganizationSettings";
import { OrganizationMembers } from "@/components/organizations/OrganizationMembers";
import { OrganizationBilling } from "@/components/organizations/OrganizationBilling";
import { useOrganization } from "@/lib/organizations/context";

export default function OrganizationSettingsPage() {
  const params = useParams<{ slug: string }>();
  const { setCurrentOrganizationBySlug, currentOrganization, isLoading } = useOrganization();

  // Set the current organization based on the slug in the URL
  useEffect(() => {
    if (params.slug && (!currentOrganization || currentOrganization.slug !== params.slug)) {
      setCurrentOrganizationBySlug(params.slug);
    }
  }, [params.slug, currentOrganization, setCurrentOrganizationBySlug]);

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex justify-center items-center min-h-[50vh]">
          <p className="text-muted-foreground">Loading organization settings...</p>
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="container py-10">
        <div className="flex justify-center items-center min-h-[50vh]">
          <p className="text-muted-foreground">Organization not found or you don&apos;t have access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{currentOrganization.name} Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization settings, members, and billing
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          <OrganizationSettings />
        </TabsContent>
        
        <TabsContent value="members" className="space-y-6">
          <OrganizationMembers />
        </TabsContent>
        
        <TabsContent value="billing" className="space-y-6">
          <OrganizationBilling organizationId={currentOrganization.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 