"use client";

import { ReactNode, Suspense, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from "@/components/theme-provider";
import { TRPCProvider } from "@/lib/trpc/trpc";
import { OrganizationProvider } from "@/lib/organizations/context";
import { TRPCClient } from '@trpc/client';
import { AppRouter } from "@/lib/trpc/router";
import { AuthErrorBoundary } from "@/components/error/auth-error-boundary";
// app/providers.tsx
import { usePostHog } from 'posthog-js/react'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from "next/navigation";
import { getEnv } from '@/lib/env';
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {

    const { NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST } = getEnv();
    console.log('Initializing PostHog');
    console.log(NEXT_PUBLIC_POSTHOG_KEY);
    console.log(NEXT_PUBLIC_POSTHOG_HOST);
    posthog.init(NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host: NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'always', // or 'always' to create profiles for anonymous users as well
      capture_pageview: false // Disable automatic pageview capture, as we capture manually
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      {children}
    </PHProvider>
  )
}

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()

  // Track pageviews
  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + "?" + searchParams.toString();
      }

      posthog.capture('$pageview', { '$current_url': url })
    }
  }, [pathname, searchParams, posthog])

  return null
}

// Wrap PostHogPageView in Suspense to avoid the useSearchParams usage above
// from de-opting the whole app into client-side rendering
// See: https://nextjs.org/docs/messages/deopted-into-client-rendering
function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  )
}
interface ProvidersProps {
  children: ReactNode;
  queryClient: QueryClient;
  trpcClient: TRPCClient<AppRouter>;
  initialOrganizationSlug?: string;
}

export function Providers({ 
  children, 
  queryClient, 
  trpcClient, 
  initialOrganizationSlug 
}: ProvidersProps) {
  return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SessionProvider>
          <QueryClientProvider client={queryClient}>
            <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
              <OrganizationProvider initialOrganizationSlug={initialOrganizationSlug}>
                <AuthErrorBoundary>
                  <PostHogProvider>
                    {children}
                  </PostHogProvider>
                </AuthErrorBoundary>
              </OrganizationProvider>
            </TRPCProvider>
          </QueryClientProvider>
        </SessionProvider>
      </ThemeProvider>
  );
} 