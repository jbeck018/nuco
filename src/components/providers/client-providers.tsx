"use client";

import { useState } from 'react';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { QueryClient } from '@tanstack/react-query';
import { AppRouter } from "@/lib/trpc/router";
import { Providers } from "@/app/providers";

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
            url: '/api/trpc',
          }),
        ],
      });
    }
    
    // Browser: make a new TRPC client if we don't already have one
    if (!trpcClient) {
      trpcClient = createTRPCClient<AppRouter>({
        links: [
          httpBatchLink({
            url: '/api/trpc',
          }),
        ],
      });
    }
    
    return trpcClient;
  };
})();

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());
  const [trpcClient] = useState(() => getTrpcClient());

  return (
    <Providers queryClient={queryClient} trpcClient={trpcClient}>
      {children}
    </Providers>
  );
} 