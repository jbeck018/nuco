"use client";;
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTRPC } from "@/lib/trpc/trpc";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

import { useMutation } from "@tanstack/react-query";

interface OrganizationInviteProps {
  inviteId: string;
  organizationId: string;
  organizationName: string;
  inviterName?: string;
}

export function OrganizationInvite({
  inviteId,
  organizationId,
  organizationName,
  inviterName,
}: OrganizationInviteProps) {
  const trpc = useTRPC();
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  const acceptInviteMutation = useMutation(trpc.organization.acceptInvite.mutationOptions({
    onSuccess: () => {
      setIsAccepted(true);
      toast({
        title: "Invitation accepted",
        description: `You have joined ${organizationName}`,
      });
      
      // Redirect to the organization dashboard
      setTimeout(() => {
        router.push(`/org/${organizationId}`);
      }, 2000);
    },
    onError: (error) => {
      console.error("Failed to accept invitation:", error);
      toast({
        title: "Error",
        description: "Failed to accept invitation",
        variant: "destructive",
      });
      setIsLoading(false);
    },
  }));

  const declineInviteMutation = useMutation(trpc.organization.declineInvite.mutationOptions({
    onSuccess: () => {
      setIsDeclined(true);
      toast({
        title: "Invitation declined",
        description: "You have declined the invitation",
      });
      
      // Redirect to the dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    },
    onError: (error) => {
      console.error("Failed to decline invitation:", error);
      toast({
        title: "Error",
        description: "Failed to decline invitation",
        variant: "destructive",
      });
      setIsLoading(false);
    },
  }));

  const handleAccept = () => {
    if (!session?.user) {
      // If not logged in, redirect to login page with callback
      router.push(`/auth/login?callbackUrl=/invites/${inviteId}`);
      return;
    }
    
    setIsLoading(true);
    acceptInviteMutation.mutate({
      inviteId,
      organizationId,
    });
  };

  const handleDecline = () => {
    if (!session?.user) {
      // If not logged in, redirect to login page with callback
      router.push(`/auth/login?callbackUrl=/invites/${inviteId}`);
      return;
    }
    
    setIsLoading(true);
    declineInviteMutation.mutate({
      inviteId,
      organizationId,
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Organization Invitation</CardTitle>
        <CardDescription>
          {inviterName
            ? `${inviterName} has invited you to join ${organizationName}`
            : `You have been invited to join ${organizationName}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAccepted ? (
          <div className="text-center py-4">
            <p className="text-green-600 dark:text-green-400 mb-2">
              Invitation accepted!
            </p>
            <p>Redirecting to the organization dashboard...</p>
          </div>
        ) : isDeclined ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-2">
              Invitation declined.
            </p>
            <p>Redirecting to your dashboard...</p>
          </div>
        ) : (
          <p className="text-center py-4">
            Would you like to join this organization?
          </p>
        )}
      </CardContent>
      {!isAccepted && !isDeclined && (
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Decline"
            )}
          </Button>
          <Button onClick={handleAccept} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Accept"
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 