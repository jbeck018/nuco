"use client";

export const runtime = 'edge';

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrganization } from "@/lib/organizations/context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

export default function OrganizationDashboardPage() {
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
          <p className="text-muted-foreground">Loading organization...</p>
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{currentOrganization.name}</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to your organization dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/org/${params.slug}/settings`}>
              <SettingsIcon className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>Basic information about your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{currentOrganization.name}</p>
              </div>
              {currentOrganization.website && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Website</p>
                  <p>{currentOrganization.website}</p>
                </div>
              )}
              {currentOrganization.billingEmail && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Billing Email</p>
                  <p>{currentOrganization.billingEmail}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Plan</p>
                <p className="capitalize">{currentOrganization.plan || "Free"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>People with access to this organization</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[200px]">
            <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground mb-4">
              Manage your organization members
            </p>
            <Button asChild variant="outline">
              <Link href={`/org/${params.slug}/settings?tab=members`}>
                Manage Members
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>Your organization&apos;s resource usage</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[200px]">
            <p className="text-center text-muted-foreground">
              Usage statistics will be displayed here
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 