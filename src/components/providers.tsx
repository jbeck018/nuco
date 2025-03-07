"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from "@/components/theme-provider";
import { TRPCProvider } from "@/lib/trpc/trpc";
import { OrganizationProvider } from "@/lib/organizations/context";
import { TRPCClient } from '@trpc/client';
import { AppRouter } from "@/lib/trpc/router";

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
              {children}
            </OrganizationProvider>
          </TRPCProvider>
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
} 