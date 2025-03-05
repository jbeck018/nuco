"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { OrganizationSettings } from "@/components/organizations/OrganizationSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization } from "@/lib/organizations/context";

export default function OrganizationGeneralSettingsPage() {
  const params = useParams<{ id: string }>();
  const { currentOrganization, setCurrentOrganizationById, isLoading } = useOrganization();

  // Set the current organization based on the ID in the URL
  useEffect(() => {
    if (params.id && (!currentOrganization || currentOrganization.id !== params.id)) {
      setCurrentOrganizationById(params.id);
    }
  }, [params.id, currentOrganization, setCurrentOrganizationById]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>Loading organization settings...</CardDescription>
        </CardHeader>
        <CardContent className="py-10">
          <div className="flex justify-center items-center min-h-[200px]">
            <p className="text-muted-foreground">Please wait while we load your data.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentOrganization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>Organization not found</CardDescription>
        </CardHeader>
        <CardContent className="py-10">
          <div className="flex justify-center items-center min-h-[200px]">
            <p className="text-muted-foreground">
              Organization not found or you don&apos;t have access.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <OrganizationSettings />;
} 