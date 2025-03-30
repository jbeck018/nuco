"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";

// Define protected routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/chat",
  "/integrations",
  "/settings",
  "/api-tokens",
];

// Define auth routes that should redirect to dashboard if already authenticated
const authRoutes = [
  "/auth/login", 
  "/auth/signup", 
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email"
];

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  // Handle authentication redirects
  useEffect(() => {
    if (status === "loading") return;

    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    if (isProtectedRoute && !session?.user) {
      const callbackUrl = encodeURIComponent(pathname);
      router.push(`/auth/login?callbackUrl=${callbackUrl}`);
      return;
    }

    if (isAuthRoute && session?.user) {
      router.push("/dashboard");
      return;
    }
  }, [pathname, session, status, router]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
} 