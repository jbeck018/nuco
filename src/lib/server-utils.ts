/**
 * Server-side utilities for optimizing React Server Components
 */

import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Cached version of headers() to avoid redundant calls
 */
export const getHeaders = cache(() => {
  return headers();
});

/**
 * Get the current request's URL
 */
export const getRequestUrl = cache(async () => {
  try {
    // headers() returns a Promise<ReadonlyHeaders> in the latest Next.js
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${host}`;
  } catch (error) {
    console.error('Error getting request URL:', error);
    return '';
  }
});

/**
 * Cached data fetching for server components
 * @param fn The function to cache
 * @returns The cached function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createServerAction<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return cache(fn) as T;
}

/**
 * Redirect with revalidation
 * @param path The path to redirect to
 */
export function redirectWithRevalidation(path: string): never {
  // Clear cache before redirecting
  const revalidateTag = crypto.randomUUID();
  redirect(`${path}?revalidate=${revalidateTag}`);
}

/**
 * Preload data for server components
 * @param promise The promise to preload
 */
export function preload<T>(promise: Promise<T>): void {
  void promise;
}

/**
 * Parallel data fetching for server components
 * @param promises The promises to fetch in parallel
 * @returns The resolved promises
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parallelFetch<T extends Promise<any>[]>(
  ...promises: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  return Promise.all(promises);
} 