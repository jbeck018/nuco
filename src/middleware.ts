import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { csrfProtection } from "@/lib/middleware/csrf";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { getUserFromRequest } from "@/lib/auth/middleware-auth";

// Define protected routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/chat",
  "/integrations",
  "/settings",
  "/api/chat",
  "/api/integrations",
];

// Define auth routes that should redirect to dashboard if already authenticated
const authRoutes = ["/auth/login", "/auth/signup"];

// Define static asset paths that should be cached
const staticAssetPaths = [
  "/_next/static",
  "/images",
  "/fonts",
  "/icons",
];

// Simple function to determine cache settings based on path
function getCacheSettings(pathname: string): string {
  // Check if the path is for static assets
  if (staticAssetPaths.some(path => pathname.startsWith(path))) {
    return "public, max-age=31536000, immutable"; // Cache static assets for 1 year
  }
  
  // API routes should not be cached
  if (pathname.startsWith("/api/")) {
    return "no-store, no-cache, must-revalidate";
  }
  
  // Default cache settings for other routes
  return "public, max-age=0, must-revalidate";
}

export async function middleware(request: NextRequest) {
  const user = await getUserFromRequest(request);
  const pathname = request.nextUrl.pathname;
  
  console.log(`Middleware processing: ${pathname}, User authenticated: ${!!user}`);
  
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  // Apply CSRF protection for mutating requests
  const csrfResponse = await csrfProtection(request);
  if (csrfResponse) {
    return csrfResponse;
  }
  
  // Apply caching headers based on path
  const response = NextResponse.next();
  
  // Set appropriate cache headers based on content type
  response.headers.set("Cache-Control", getCacheSettings(pathname));
  
  // Add Server-Timing header for performance monitoring
  const startTime = Date.now();
  const endTime = Date.now();
  response.headers.set(
    "Server-Timing", 
    `edge;dur=${endTime - startTime};desc="Edge Middleware"`
  );
  
  // Check if the path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) => 
    pathname.startsWith(route)
  );
  
  // Check if the path is an auth route
  const isAuthRoute = authRoutes.some((route) => 
    pathname.startsWith(route)
  );
  
  // If the user is not authenticated and trying to access a protected route
  if (!user && (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/integrations') ||
    pathname.startsWith('/org') ||
    pathname.startsWith('/settings')
  )) {
    console.log(`Redirecting unauthenticated user from ${pathname} to login page`);
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  // If the user is authenticated and trying to access an organization route
  if (user && pathname.startsWith('/org')) {
    // Extract the organization slug from the URL
    const orgSlug = pathname.split('/')[2];
    
    // If no organization slug is provided, redirect to the default organization
    if (!orgSlug && user.defaultOrganizationId) {
      // We need to fetch the organization slug from the database
      // For now, redirect to a page that will handle this
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // Organization access control will be handled by the page components
    // using the OrganizationProvider
  }
  
  // If the route is protected and the user is not authenticated, redirect to login
  if (isProtectedRoute && !user) {
    console.log(`Protected route check: Redirecting from ${pathname} to login page`);
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("callbackUrl", encodeURI(pathname));
    return NextResponse.redirect(url);
  }
  
  // If the route is an auth route and the user is already authenticated, redirect to dashboard
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  
  // Continue with the request for all other cases
  return response;
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - favicon.ico (favicon file)
     * - public files (public assets)
     */
    "/((?!favicon.ico|public).*)",
    '/dashboard/:path*',
    '/chat/:path*',
    '/integrations/:path*',
    '/org/:path*',
    '/settings/:path*',
  ],
}; 