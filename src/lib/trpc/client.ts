/**
 * tRPC client configuration
 * This file sets up the tRPC client for use in the application
 */
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/lib/trpc/router';

/**
 * Create a tRPC client for use in React components
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Create a tRPC client for server-side usage
 * @param headers - HTTP headers to include in the request
 * @returns A tRPC client for server-side usage
 */
export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // In the browser, use the current URL
    return '';
  }
  
  // In SSR, use the server's URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Fallback to localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Create a tRPC client configuration
 */
export function getTRPCClientConfig() {
  return {
    links: [
      {
        url: `${getBaseUrl()}/api/trpc`,
      },
    ],
  };
} 