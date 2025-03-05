import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Session data type
 * This defines the structure of the session data stored in the cookie
 */
export interface SessionData {
  userId?: string;
  isLoggedIn: boolean;
  csrfToken?: string;
  expiresAt?: number;
}

/**
 * Typed Iron Session
 * This extends the IronSession interface with our SessionData type
 */
export type TypedIronSession = IronSession<SessionData>;

/**
 * Iron Session options
 * These options configure the behavior of Iron Session
 */
export const sessionOptions: SessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD || 'complex_password_at_least_32_characters_long',
  cookieName: 'nuco_session',
  cookieOptions: {
    // secure: true should be used in production (HTTPS) but can be false in development (HTTP)
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

/**
 * Get the session from the request
 * @returns The typed Iron Session
 */
export async function getSession(): Promise<TypedIronSession> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  
  // Initialize session if it doesn't exist
  if (!session.isLoggedIn) {
    session.isLoggedIn = false;
  }
  
  return session;
}

/**
 * Create a new session
 * @param userId - The user ID to store in the session
 * @returns A new session with the user ID
 */
export async function createSession(userId: string): Promise<TypedIronSession> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  
  // Set session data
  session.userId = userId;
  session.isLoggedIn = true;
  session.csrfToken = generateCsrfToken();
  // Default to 1 week if maxAge is undefined
  const maxAge = sessionOptions.cookieOptions?.maxAge ?? (60 * 60 * 24 * 7);
  session.expiresAt = Date.now() + maxAge * 1000;
  
  // Save the session
  await session.save();
  
  return session;
}

/**
 * Destroy the session
 * @returns A response with the session cookie removed
 */
export async function destroySession(): Promise<NextResponse> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  
  // Clear session data
  session.userId = undefined;
  session.isLoggedIn = false;
  session.csrfToken = undefined;
  session.expiresAt = undefined;
  
  // Save the session (which will clear it)
  await session.save();
  
  return NextResponse.json({ success: true });
}

/**
 * Generate a CSRF token
 * @returns A random string to use as a CSRF token
 */
function generateCsrfToken(): string {
  return crypto.randomUUID();
}

/**
 * Validate a CSRF token
 * @param session - The session containing the stored CSRF token
 * @param token - The token to validate
 * @returns True if the token is valid
 */
export function validateCsrfToken(session: TypedIronSession, token?: string): boolean {
  if (!session.csrfToken || !token) {
    return false;
  }
  
  return session.csrfToken === token;
} 