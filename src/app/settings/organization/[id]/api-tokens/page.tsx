"use client";

/**
 * Organization API Tokens Settings Page
 * 
 * This page provides a user interface for managing custom API tokens
 * for AI providers and configuring token usage limits.
 */
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization } from "@/lib/organizations/context";
import { ApiTokenManagement } from "@/components/settings/ApiTokenManagement";

export const runtime = 'edge';

export default function OrganizationApiTokensPage() {
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
          <CardTitle>API Tokens</CardTitle>
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
          <CardTitle>API Tokens</CardTitle>
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
          <CardTitle>AI Provider API Tokens</CardTitle>
          <CardDescription>
            Manage custom API tokens for AI providers and configure token usage limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiTokenManagement organizationId={currentOrganization.id} />
        </CardContent>
      </Card>
    </div>
  );
} 