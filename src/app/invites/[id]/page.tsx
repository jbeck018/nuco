"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { OrganizationInvite } from "@/components/organizations/OrganizationInvite";
import { trpc } from "@/lib/trpc/client";
import { Loader2 } from "lucide-react";

export default function InvitePage() {
  const params = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<{
    id: string;
    organizationId: string;
    organizationName: string;
    inviterName?: string;
  } | null>(null);

  const getInviteQuery = trpc.organization.getInvite.useQuery(
    { inviteId: params.id },
    {
      enabled: !!params.id,
      onSuccess: (data) => {
        if (data) {
          setInviteData({
            id: params.id,
            organizationId: data.organizationId,
            organizationName: data.organizationName,
            inviterName: data.inviterName,
          });
        } else {
          setError("Invitation not found or has expired");
        }
        setIsLoading(false);
      },
      onError: (error) => {
        console.error("Error fetching invitation:", error);
        setError("Failed to load invitation");
        setIsLoading(false);
      },
    }
  );

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