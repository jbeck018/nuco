import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
// In production, use environment variables for the Redis connection
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Create rate limiters with different configurations
const globalRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1m'), // 100 requests per minute
  analytics: true,
  prefix: 'ratelimit:global',
});

const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1m'), // 10 requests per minute for auth endpoints
  analytics: true,
  prefix: 'ratelimit:auth',
});

const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '1m'), // 50 requests per minute for API endpoints
  analytics: true,
  prefix: 'ratelimit:api',
});

/**
 * Rate limiting middleware
 * This middleware applies rate limiting to requests based on IP address and endpoint
 * 
 * @param req - The Next.js request object
 * @returns The Next.js response object or undefined to continue
 */
export async function rateLimit(req: NextRequest): Promise<NextResponse | undefined> {
  // Get the IP address from the request headers
  // For production behind a proxy, use X-Forwarded-For header
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'anonymous';
  
  // Skip rate limiting for static assets
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/static') ||
    req.nextUrl.pathname.startsWith('/favicon.ico')
  ) {
    return undefined;
  }
  
  try {
    // Choose the appropriate rate limiter based on the endpoint
    let limiter = globalRatelimit;
    
    if (req.nextUrl.pathname.startsWith('/api/auth')) {
      limiter = authRatelimit;
    } else if (req.nextUrl.pathname.startsWith('/api/')) {
      limiter = apiRatelimit;
    }
    
    // Apply rate limiting
    const { success, limit, reset, remaining } = await limiter.limit(ip);
    
    // Set rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', limit.toString());
    headers.set('X-RateLimit-Remaining', remaining.toString());
    headers.set('X-RateLimit-Reset', reset.toString());
    
    // If rate limit exceeded, return 429 Too Many Requests
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later.' },
        { 
          status: 429,
          headers
        }
      );
    }
    
    // Continue with the request
    const response = NextResponse.next();
    
    // Add rate limit headers to the response
    Object.entries(Object.fromEntries(headers.entries())).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    console.error('Rate limiting error:', error);
    
    // If rate limiting fails, allow the request to continue
    return undefined;
  }
} 