"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserProfile, useUserIntegrations, useUserOrganizations, useDashboardStats } from "@/hooks/useDashboard";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { profile, isLoading: isLoadingProfile } = useUserProfile();
  const { organizations, isLoading: isLoadingOrganizations } = useUserOrganizations();
  const { integrations, isLoading: isLoadingIntegrations } = useUserIntegrations();
  const { stats } = useDashboardStats();
  
  const isLoading = isLoadingProfile || isLoadingOrganizations || isLoadingIntegrations;

  useEffect(() => {
    // Redirect if not authenticated
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading dashboard...</h2>
          <p className="text-muted-foreground">Please wait while we load your data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Welcome, {profile?.name || session?.user?.name || "User"}!</h1>
      
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Your connected services</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.integrationsCount}</p>
            <p className="text-sm text-muted-foreground">
              {stats.activeIntegrationsCount} active
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/integrations">Manage Integrations</Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Organizations</CardTitle>
            <CardDescription>Your workspaces</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.organizationsCount}</p>
            <p className="text-sm text-muted-foreground">
              with {stats.membersCount} total members
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/organizations">View Organizations</Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>API Usage</CardTitle>
            <CardDescription>API calls this month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">
              Usage tracking coming soon
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full" disabled>
              <Link href="#">View Usage</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Integrations</CardTitle>
            <CardDescription>Your most recent connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrations && integrations.length > 0 ? (
              integrations.slice(0, 3).map((integration) => (
                <div key={integration.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{integration.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{integration.type}</p>
                  </div>
                  <div className="flex items-center">
                    <span className={`mr-2 h-2 w-2 rounded-full ${integration.status === 'connected' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                    <span className="text-sm capitalize">{integration.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No integrations found</p>
              </div>
            )}
            {integrations && integrations.length > 0 && (
              <Button asChild variant="outline" className="w-full mt-2">
                <Link href="/integrations">View All Integrations</Link>
              </Button>
            )}
            {integrations && integrations.length === 0 && (
              <Button asChild className="w-full mt-2">
                <Link href="/integrations/new">Add Your First Integration</Link>
              </Button>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="text-muted-foreground">{profile?.name || session?.user?.name || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-muted-foreground">{profile?.email || session?.user?.email || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Role</p>
              <p className="text-muted-foreground capitalize">{profile?.role || (session?.user as { role?: string })?.role || "user"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Organizations</p>
              <div className="mt-2 space-y-2">
                {organizations && organizations.length > 0 ? (
                  organizations.slice(0, 3).map((org) => (
                    <div key={org.id} className="rounded-lg border p-2">
                      <p className="font-medium">{org.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">Role: {org.role}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No organizations found</p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex w-full gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/settings/profile">Edit Profile</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/organizations/new">Create Organization</Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 