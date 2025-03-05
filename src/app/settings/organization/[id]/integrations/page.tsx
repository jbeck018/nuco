"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization } from "@/lib/organizations/context";
import { IntegrationsList } from "@/app/integrations/components/integrations-list";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useUserIntegrations } from "@/hooks/useDashboard";

export default function OrganizationIntegrationsSettingsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { currentOrganization, setCurrentOrganizationById, isLoading } = useOrganization();

  // Extract success and error messages from search params
  const successMessage = searchParams.get("success");
  const errorMessage = searchParams.get("error");

  // Set the current organization based on the ID in the URL
  useEffect(() => {
    if (params.id && (!currentOrganization || currentOrganization.id !== params.id)) {
      setCurrentOrganizationById(params.id);
    }
  }, [params.id, currentOrganization, setCurrentOrganizationById]);

  // Pre-fetch integrations data
  const { isLoading: isLoadingIntegrations } = useUserIntegrations(params.id);

  if (isLoading || isLoadingIntegrations) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Integrations</CardTitle>
          <CardDescription>Loading integrations...</CardDescription>
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
          <CardTitle>Organization Integrations</CardTitle>
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Connect your organization with external services to extend its functionality.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Display success/error messages */}
          <div className="space-y-4 mb-6">
            {successMessage && (
              <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* The IntegrationsList now uses the organization context directly */}
          <IntegrationsList />
        </CardContent>
      </Card>
    </div>
  );
} 