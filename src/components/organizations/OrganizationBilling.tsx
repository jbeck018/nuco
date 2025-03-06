/**
 * Organization Billing Component
 * 
 * This component displays and manages organization subscription and billing information.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/trpc";
import { formatAmount } from "@/lib/stripe/utils";
import { isOnPaidPlan, hasActiveSubscription } from "@/lib/stripe/service";

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";

interface OrganizationBillingProps {
  organizationId: string;
}

export function OrganizationBilling({ organizationId }: OrganizationBillingProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Get subscription status
  const { data: subscriptionData, isLoading: isLoadingSubscription } = 
    useQuery(
      trpc.organization.getSubscriptionStatus.queryOptions({ id: organizationId })
    );

  // Get available plans
  const { data: plans, isLoading: isLoadingPlans } = 
    useQuery(trpc.organization.getAvailablePlans.queryOptions());

  // Create checkout session mutation
  const createCheckoutSession = useMutation(trpc.organization.createCheckoutSession.mutationOptions({
    onSuccess: (data) => {
      if (data.url) {
        router.push(data.url);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
      setIsLoading(false);
    },
  }));

  // Create customer portal session mutation
  const createCustomerPortalSession = useMutation(trpc.organization.createCustomerPortalSession.mutationOptions({
    onSuccess: (data) => {
      if (data.url) {
        router.push(data.url);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer portal session",
        variant: "destructive",
      });
      setIsLoading(false);
    },
  }));

  // Handle subscription checkout
  const handleCheckout = async (priceId: string) => {
    setIsLoading(true);
    createCheckoutSession.mutate({
      organizationId,
      priceId,
    });
  };

  // Handle customer portal
  const handleCustomerPortal = async () => {
    setIsLoading(true);
    createCustomerPortalSession.mutate({
      organizationId,
    });
  };

  // Format subscription status for display
  const getStatusBadge = () => {
    if (!subscriptionData?.status) return null;

    const statusMap: Record<string, { label: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
      active: { label: "Active", variant: "default" },
      trialing: { label: "Trial", variant: "secondary" },
      canceled: { label: "Canceled", variant: "destructive" },
      incomplete: { label: "Incomplete", variant: "outline" },
      incomplete_expired: { label: "Expired", variant: "destructive" },
      past_due: { label: "Past Due", variant: "destructive" },
      unpaid: { label: "Unpaid", variant: "destructive" },
    };

    const status = statusMap[subscriptionData.status] || { label: subscriptionData.status, variant: "outline" };

    return (
      <Badge variant={status.variant}>{status.label}</Badge>
    );
  };

  // Format current plan for display
  const getCurrentPlan = () => {
    if (isLoadingSubscription) {
      return <Skeleton className="h-4 w-24" />;
    }

    const plan = subscriptionData?.plan || "free";
    const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
    
    return (
      <div className="flex items-center gap-2">
        <span>{planName}</span>
        {getStatusBadge()}
      </div>
    );
  };

  // Format current period end for display
  const getCurrentPeriodEnd = () => {
    if (isLoadingSubscription || !subscriptionData?.currentPeriodEnd) {
      return null;
    }

    const date = new Date(subscriptionData.currentPeriodEnd);
    return (
      <div className="text-sm text-muted-foreground">
        {subscriptionData.cancelAtPeriodEnd 
          ? `Cancels on ${date.toLocaleDateString()}`
          : `Renews on ${date.toLocaleDateString()}`
        }
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium">Current Plan</h3>
                <div className="mt-1">{getCurrentPlan()}</div>
                {getCurrentPeriodEnd()}
              </div>
              <div>
                <h3 className="text-sm font-medium">Billing</h3>
                <div className="mt-1">
                  {hasActiveSubscription(subscriptionData?.status) ? (
                    <Button
                      variant="outline"
                      onClick={handleCustomerPortal}
                      disabled={isLoading}
                    >
                      Manage Billing
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">No active subscription</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Choose a plan that works for your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPlans ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Free Plan */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Free</CardTitle>
                  <CardDescription>For small teams getting started</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-3xl font-bold">$0</div>
                  <div className="text-sm text-muted-foreground">Forever free</div>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li>Up to 3 team members</li>
                    <li>1 integration</li>
                    <li>100 requests per month</li>
                    <li>Basic features</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!isOnPaidPlan(subscriptionData?.plan)}
                    onClick={handleCustomerPortal}
                  >
                    {isOnPaidPlan(subscriptionData?.plan) ? "Downgrade" : "Current Plan"}
                  </Button>
                </CardFooter>
              </Card>

              {/* Paid Plans */}
              {plans?.map((plan) => (
                <Card key={plan.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description || `For growing teams`}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="text-3xl font-bold">{formatAmount(plan.amount, plan.currency)}</div>
                    <div className="text-sm text-muted-foreground">
                      per {plan.interval === "month" ? "month" : "year"}
                    </div>
                    <ul className="mt-4 space-y-2 text-sm">
                      {plan.features?.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      disabled={isLoading || (subscriptionData?.plan === plan.name.toLowerCase() && hasActiveSubscription(subscriptionData?.status))}
                      onClick={() => handleCheckout(plan.id)}
                    >
                      {subscriptionData?.plan === plan.name.toLowerCase() && hasActiveSubscription(subscriptionData?.status)
                        ? "Current Plan"
                        : "Subscribe"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 