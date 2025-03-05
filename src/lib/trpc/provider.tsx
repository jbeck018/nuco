'use client';

/**
 * tRPC provider component
 * This component provides tRPC client to the React component tree
 */
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from './client';
import { getBaseUrl } from './client';

/**
 * Props for the TRPCProvider component
 */
interface TRPCProviderProps {
  children: React.ReactNode;
}

/**
 * TRPCProvider component
 * Provides tRPC client to the React component tree
 */
export function TRPCProvider({ children }: TRPCProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
} 