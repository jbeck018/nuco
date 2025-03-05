import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { csrfProtection } from "@/lib/middleware/csrf";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { auth } from '@/lib/auth';

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

export async function middleware(request: NextRequest) {
  const session = await auth();
  const pathname = request.nextUrl.pathname;
  
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
  
  // Check if the path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) => 
    pathname.startsWith(route)
  );
  
  // Check if the path is an auth route
  const isAuthRoute = authRoutes.some((route) => 
    pathname.startsWith(route)
  );
  
  // Get the authentication token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // If the user is not authenticated and trying to access a protected route
  if (!session?.user && (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/integrations') ||
    pathname.startsWith('/org') ||
    pathname.startsWith('/settings')
  )) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  // If the user is authenticated and trying to access an organization route
  if (session?.user && pathname.startsWith('/org')) {
    // Extract the organization slug from the URL
    const orgSlug = pathname.split('/')[2];
    
    // If no organization slug is provided, redirect to the default organization
    if (!orgSlug && session.user.defaultOrganizationId) {
      // We need to fetch the organization slug from the database
      // For now, redirect to a page that will handle this
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // Organization access control will be handled by the page components
    // using the OrganizationProvider
  }
  
  // If the route is protected and the user is not authenticated, redirect to login
  if (isProtectedRoute && !token) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("callbackUrl", encodeURI(pathname));
    return NextResponse.redirect(url);
  }
  
  // If the route is an auth route and the user is already authenticated, redirect to dashboard
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  
  // Continue with the request for all other cases
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
    '/dashboard/:path*',
    '/chat/:path*',
    '/integrations/:path*',
    '/org/:path*',
    '/settings/:path*',
  ],
}; 