import { NextRequest, NextResponse } from 'next/server';
import { getSession, validateCsrfToken } from '@/lib/session/iron-session';

/**
 * CSRF protection middleware
 * This middleware validates the CSRF token for mutating requests (POST, PUT, DELETE)
 * 
 * @param req - The Next.js request object
 * @returns The Next.js response object or undefined to continue
 */
export async function csrfProtection(req: NextRequest): Promise<NextResponse | undefined> {
  // Only check CSRF for mutating methods
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (!mutatingMethods.includes(req.method)) {
    return undefined;
  }
  
  // Skip CSRF check for authentication endpoints
  if (req.nextUrl.pathname.startsWith('/api/auth')) {
    return undefined;
  }
  
  try {
    // Get the session
    const session = await getSession(req);
    
    // If not logged in, no need to check CSRF
    if (!session.isLoggedIn) {
      return undefined;
    }
    
    // Get the CSRF token from the request
    const csrfToken = req.headers.get('x-csrf-token');
    
    // Validate the CSRF token
    if (!validateCsrfToken(session, csrfToken || undefined)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
    
    // Continue with the request
    return undefined;
  } catch (error) {
    console.error('CSRF validation error:', error);
    
    // Return a 403 Forbidden response
    return NextResponse.json(
      { error: 'CSRF validation failed' },
      { status: 403 }
    );
  }
} 