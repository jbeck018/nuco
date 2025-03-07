/**
 * tRPC API route handler
 * This file handles all tRPC API requests
 */
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/trpc/router';
import { createContext } from '@/lib/trpc/server';

/**
 * Handle GET requests
 */
export async function GET(
  request: Request,
  { params }: { params: { trpc: string | string[] } }
) {
  return handleRequest(request, params);
}

/**
 * Handle POST requests
 */
export async function POST(
  request: Request,
  { params }: { params: { trpc: string | string[] } }
) {
  return handleRequest(request, params);
}

/**
 * Handle all tRPC requests
 */
async function handleRequest(
  request: Request,
  params: { trpc: string | string[] }
) {
  // In Next.js App Router, dynamic route parameters might be promises
  // so we need to ensure we're handling them properly
  const resolvedParams = params instanceof Promise ? await params : params;
  const trpcParam = resolvedParams.trpc;
  
  const trpcRoute = Array.isArray(trpcParam) 
    ? trpcParam.join(',')
    : trpcParam;
    
  console.log('handleRequest', trpcRoute);
  
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(`❌ tRPC error on ${path ?? '<no-path>'}: ${error.message}`);
          }
        : undefined,
  });
} 