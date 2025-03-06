"use client";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";
import { MainNav } from "@/components/navigation/main-nav";
import { SessionProvider } from "next-auth/react";
import { TRPCProvider } from "@/lib/trpc/trpc";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppRouter } from "@/lib/trpc/router";

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
  
  const isDashboardRoute = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/chat') || 
                          pathname.startsWith('/settings') || 
                          pathname.startsWith('/integrations');

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <QueryClientProvider client={queryClient}>
              <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
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
                  {isDashboardRoute && children}
                </MainNav>
                <Toaster />
              </TRPCProvider>
            </QueryClientProvider>
          </SessionProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
