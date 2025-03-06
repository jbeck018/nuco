/**
 * Middleware-safe authentication utilities
 * This file contains authentication utilities that are safe to use in middleware
 * It does NOT import the password module or any other Node.js-specific modules
 */

import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

/**
 * Check if a user is authenticated based on their JWT token
 * Safe to use in middleware (Edge runtime)
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  return !!token;
}

/**
 * Get user information from the JWT token
 * Safe to use in middleware (Edge runtime)
 */
export async function getUserFromRequest(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  if (!token) {
    return null;
  }
  
  return {
    id: token.id,
    role: token.role,
    defaultOrganizationId: token.defaultOrganizationId,
  };
} 