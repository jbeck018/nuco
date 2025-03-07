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
const authRoutes = [
  "/auth/login", 
  "/auth/signup", 
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email"
];

// Define public routes that should be accessible regardless of authentication status
const publicRoutes = [
  "/about",
  "/pricing",
  "/contact",
  "/privacy",
  "/terms",
  "/api/webhooks",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml"
];

// Define landing page routes that should redirect to dashboard when authenticated
const landingRoutes = [
  "/",
  "/home",
  "/landing"
];

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

// Helper function to check if a path matches any of the routes in the array
function matchesAnyRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => 
    pathname === route || 
    pathname.startsWith(`${route}/`)
  );
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
  const isProtectedRoute = matchesAnyRoute(pathname, protectedRoutes);
  
  // Check if the path is an auth route
  const isAuthRoute = matchesAnyRoute(pathname, authRoutes);
  
  // Check if the path is a public route
  const isPublicRoute = matchesAnyRoute(pathname, publicRoutes);
  
  // Check if the path is a landing route
  const isLandingRoute = matchesAnyRoute(pathname, landingRoutes);
  
  console.log(`Path analysis: ${pathname}, Protected: ${isProtectedRoute}, Auth: ${isAuthRoute}, Public: ${isPublicRoute}, Landing: ${isLandingRoute}`);
  
  // CASE 1: Unauthenticated user trying to access protected route -> redirect to login
  if (!user && isProtectedRoute) {
    console.log(`Redirecting unauthenticated user from protected route ${pathname} to login`);
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  // CASE 2: Authenticated user trying to access auth route -> redirect to dashboard
  if (user && isAuthRoute) {
    console.log(`Redirecting authenticated user from auth route ${pathname} to dashboard`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // CASE 3: Authenticated user trying to access landing route -> redirect to dashboard
  if (user && isLandingRoute) {
    console.log(`Redirecting authenticated user from landing route ${pathname} to dashboard`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // CASE 4: If the user is authenticated and trying to access an organization route
  if (user && pathname.startsWith('/org')) {
    // Extract the organization slug from the URL
    const orgSlug = pathname.split('/')[2];
    
    // If no organization slug is provided, redirect to the default organization
    if (!orgSlug && user.defaultOrganizationId) {
      console.log(`Redirecting from empty org slug to dashboard`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // Continue with the request for all other cases
  console.log(`Continuing with request for ${pathname}`);
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
    '/',  // Explicitly match the root path
    '/dashboard/:path*',
    '/chat/:path*',
    '/integrations/:path*',
    '/org/:path*',
    '/settings/:path*',
  ],
}; 