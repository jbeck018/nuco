"use client";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";
import { MainNav } from "@/components/navigation/main-nav";
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppRouter } from "@/lib/trpc/router";
import { QueryClient } from '@tanstack/react-query';
import { Providers } from "@/components/providers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const inter = Inter({ subsets: ["latin"] });

// Create a client-side singleton QueryClient
const getQueryClient = (() => {
  let queryClient: QueryClient | undefined = undefined;
  
  return () => {
    if (typeof window === 'undefined') {
      // Server: always make a new query client
      return new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      });
    }
    
    // Browser: make a new query client if we don't already have one
    if (!queryClient) {
      queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      });
    }
    
    return queryClient;
  };
})();

// Create a client-side singleton TRPC client
const getTrpcClient = (() => {
  let trpcClient: ReturnType<typeof createTRPCClient<AppRouter>> | undefined = undefined;
  
  return () => {
    if (typeof window === 'undefined') {
      // Server: always make a new TRPC client
      return createTRPCClient<AppRouter>({
        links: [
          httpBatchLink({
            url: '/api/trpc', // Use relative URL instead of hardcoded localhost
          }),
        ],
      });
    }
    
    // Browser: make a new TRPC client if we don't already have one
    if (!trpcClient) {
      trpcClient = createTRPCClient<AppRouter>({
        links: [
          httpBatchLink({
            url: '/api/trpc', // Use relative URL instead of hardcoded localhost
          }),
        ],
      });
    }
    
    return trpcClient;
  };
})();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Use state to ensure consistent references during rendering
  const [queryClient] = useState(() => getQueryClient());
  const [trpcClient] = useState(() => getTrpcClient());
  const pathname = usePathname();
  
  // Update the check to include all routes that use the organization context
  const isDashboardRoute = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/chat') || 
                          pathname.startsWith('/settings') || 
                          pathname.startsWith('/integrations') ||
                          pathname.startsWith('/org');
  
  // Extract organization slug from pathname if it's an org route
  let initialOrganizationSlug: string | undefined;
  if (pathname.startsWith('/org/')) {
    const parts = pathname.split('/');
    if (parts.length >= 3) {
      initialOrganizationSlug = parts[2];
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} overflow-hidden`}>
        <Providers 
          queryClient={queryClient} 
          trpcClient={trpcClient} 
          initialOrganizationSlug={initialOrganizationSlug}
        >
          <MainNav>
            {!isDashboardRoute && (
              <div className="flex min-h-screen flex-col">
                <main className="flex-1">{children}</main>
                <footer className="border-t py-6">
                  <div className="container mx-auto px-4">
                    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                      <p className="text-center text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} Nuco. All rights reserved.
                      </p>
                      <div className="flex items-center space-x-4">
                        <a
                          href="#"
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          Terms
                        </a>
                        <a
                          href="#"
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          Privacy
                        </a>
                        <a
                          href="#"
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          Contact
                        </a>
                      </div>
                    </div>
                  </div>
                </footer>
              </div>
            )}
            {isDashboardRoute && (
              <DashboardShell>
                {children}
              </DashboardShell>
            )}
          </MainNav>
          <Toaster />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
