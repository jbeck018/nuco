import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Check if we're in a development environment
const isDevelopment = process.env.NODE_ENV === 'development';

// Initialize Redis client
// In production, use environment variables for the Redis connection
// In development, use a mock implementation if credentials are missing
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Create a Redis client only if both URL and token are available
const redis = (redisUrl && redisToken) 
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : undefined;

// Create a mock rate limiter for development if Redis is not configured
const createRateLimiter = (windowSize: number, windowDuration: string, prefix: string) => {
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(windowSize, windowDuration),
      analytics: true,
      prefix,
    });
  } else if (isDevelopment) {
    // Mock implementation for development
    console.warn(`[Upstash Redis] Using mock rate limiter for ${prefix} - no rate limiting will be applied`);
    return {
      limit: async () => ({ 
        success: true, 
        limit: windowSize, 
        reset: Date.now() + 60000, 
        remaining: windowSize - 1 
      })
    };
  } else {
    // For production, log an error but provide a permissive fallback
    console.error('[Upstash Redis] Missing Redis credentials. Rate limiting is disabled.');
    return {
      limit: async () => ({ 
        success: true, 
        limit: windowSize, 
        reset: Date.now() + 60000, 
        remaining: windowSize - 1 
      })
    };
  }
};

// Create rate limiters with different configurations
const globalRatelimit = createRateLimiter(100, '1m', 'ratelimit:global'); // 100 requests per minute
const authRatelimit = createRateLimiter(10, '1m', 'ratelimit:auth'); // 10 requests per minute for auth endpoints
const apiRatelimit = createRateLimiter(50, '1m', 'ratelimit:api'); // 50 requests per minute for API endpoints

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