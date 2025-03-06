/**
 * tRPC server-side helpers
 * This file provides utilities for using tRPC on the server
 */
import { createServerSideHelpers as _createServerSideHelpers } from '@trpc/react-query/server';
import { appRouter } from './router';
import { createContext } from './server';
import superjson from 'superjson';

/**
 * Create server-side helpers for tRPC
 * This allows for prefetching tRPC queries on the server
 * @returns Server-side helpers for tRPC
 */
export async function createServerSideHelpers() {
  const ctx = await createContext();
  
  return _createServerSideHelpers({
    router: appRouter,
    ctx,
    transformer: superjson, // Optional: Add a transformer if you're using one
  });
} 