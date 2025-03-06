"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Define the complete signup form schema with validation
const completeSignupSchema = z.object({
  organizationName: z.string().min(2, {
    message: "Organization name must be at least 2 characters.",
  }),
});

type CompleteSignupFormValues = z.infer<typeof completeSignupSchema>;

export default function CompleteSignupPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const provider = searchParams.get("provider") || "";

  // Redirect to dashboard if user is already fully registered
  useEffect(() => {
    if (status === "authenticated" && session?.user?.defaultOrganizationId) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // Initialize the form with react-hook-form
  const form = useForm<CompleteSignupFormValues>({
    resolver: zodResolver(completeSignupSchema),
    defaultValues: {
      organizationName: "",
    },
  });

  // Handle form submission
  async function onSubmit(values: CompleteSignupFormValues) {
    if (!session?.user?.id) {
      setError("You must be logged in to complete signup");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Make a POST request to update the user's organization
      const response = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: session.user.id,
          organizationName: values.organizationName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to complete signup");
      }

      toast({
        title: "Signup completed!",
        description: "Your account has been fully set up.",
      });

      // Redirect to dashboard after successful signup completion
      router.push("/dashboard");
    } catch (error) {
      console.error("Complete signup error:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete signup",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Show error if not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You need to be logged in to complete your signup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/auth/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Complete Your Signup</CardTitle>
          <CardDescription>
            {provider && `You've successfully signed in with ${provider}. `}
            Please provide the following information to complete your account setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Processing..." : "Complete Signup"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 