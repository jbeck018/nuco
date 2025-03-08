"use client";

export const runtime = 'edge';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { OrganizationInvite } from "@/components/organizations/OrganizationInvite";
import { useTRPC } from "@/lib/trpc/trpc";
import { Loader2 } from "lucide-react";

import { useQuery } from "@tanstack/react-query";

export default function InvitePage() {
  const trpc = useTRPC();
  const params = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<{
    id: string;
    organizationId: string;
    organizationName: string;
    inviterName?: string;
  } | null>(null);

  // Use the query directly and handle the data in useEffect
  const { data, isError, error: queryError, isSuccess } = useQuery(
    trpc.organization.getInvite.queryOptions({ inviteId: params.id }, {
      enabled: !!params.id,
    })
  );

  // Handle data and errors with useEffect
  useEffect(() => {
    if (data) {
      setInviteData({
        id: params.id,
        organizationId: data.organizationId,
        organizationName: data.organizationName,
        inviterName: data.inviterName,
      });
      setIsLoading(false);
    } else if (isError) {
      console.error("Error fetching invitation:", queryError);
      setError("Failed to load invitation");
      setIsLoading(false);
    } else if (isSuccess && !data) {
      // Handle case when query succeeds but returns null/undefined
      setError("Invitation not found or has expired");
      setIsLoading(false);
    }
  }, [data, isError, isSuccess, queryError, params.id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading invitation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-destructive/10 p-4 rounded-md text-destructive">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!inviteData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-destructive/10 p-4 rounded-md text-destructive">
          <p className="font-semibold">Invalid Invitation</p>
          <p>This invitation does not exist or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <OrganizationInvite
        inviteId={inviteData.id}
        organizationId={inviteData.organizationId}
        organizationName={inviteData.organizationName}
        inviterName={inviteData.inviterName}
      />
    </div>
  );
} 