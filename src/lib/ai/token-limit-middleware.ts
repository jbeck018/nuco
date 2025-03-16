/**
 * Token Limit Middleware
 * 
 * This middleware checks if an organization has exceeded its token usage limit
 * before allowing AI service requests to proceed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { hasExceededTokenLimit } from './service';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { organizationSettings } from '@/lib/db/schema/organization-settings';
import { users } from '@/lib/db/schema/users';

/**
 * Middleware to check token limits before allowing AI service requests
 * 
 * @param req The Next.js request object
 * @param organizationId The ID of the organization to check
 * @param useCustomTokens Whether the request is using custom tokens
 * @returns A response object if the request should be blocked, or null if it should proceed
 */
export async function checkTokenLimit(
  req: NextRequest,
  organizationId: string,
  useCustomTokens?: boolean
): Promise<NextResponse | null> {
  try {
    // If using custom tokens, skip the token limit check
    if (useCustomTokens) {
      return null;
    }
    
    // Check if the organization has exceeded its token limit
    const hasExceeded = await hasExceededTokenLimit(organizationId);
    
    if (hasExceeded) {
      // Return an error response if the token limit has been exceeded
      return NextResponse.json(
        {
          error: 'Token limit exceeded',
          message: 'Your organization has reached its monthly token usage limit. Please purchase more tokens or add a custom API key.',
          code: 'token_limit_exceeded',
        },
        { status: 402 } // 402 Payment Required
      );
    }
    
    // If the token limit has not been exceeded, allow the request to proceed
    return null;
  } catch (error) {
    console.error('Error checking token limit:', error);
    
    // In case of an error, allow the request to proceed to avoid blocking legitimate requests
    return null;
  }
}

/**
 * Helper function to extract organization ID and custom token settings from a request
 * 
 * @param req The Next.js request object
 * @returns An object containing the organization ID and whether custom tokens are being used
 */
export async function extractTokenSettings(req: NextRequest): Promise<{
  organizationId?: string;
  useCustomTokens?: boolean;
}> {
  try {
    // Try to get the organization ID from the request body
    const body = await req.json();
    
    // Clone the request since we've consumed the body
    const newReq = new NextRequest(req.url, {
      headers: req.headers,
      method: req.method,
      body: JSON.stringify(body),
      cache: req.cache,
      credentials: req.credentials,
      integrity: req.integrity,
      keepalive: req.keepalive,
      mode: req.mode,
      redirect: req.redirect,
      referrer: req.referrer,
      referrerPolicy: req.referrerPolicy,
    });
    
    // Get organization ID from the request body or query parameters
    let organizationId = body.organizationId || req.nextUrl.searchParams.get('organizationId');
    let useCustomTokens = body.useCustomTokens || req.nextUrl.searchParams.get('useCustomTokens') === 'true';
    
    // If organization ID is not in the request, try to get it from the session
    if (!organizationId) {
      try {
        const session = await auth();
        const userId = session?.user?.id;
        
        if (userId) {
          // Get the user's default organization
          const user = await db.query.users.findFirst({
            where: (user) => eq(user.id, userId),
          });
          
          if (user?.defaultOrganizationId) {
            organizationId = user.defaultOrganizationId;
            
            // Get organization settings to check if custom tokens are enabled
            const orgSettings = await db.query.organizationSettings.findFirst({
              where: (settings) => eq(settings.organizationId, organizationId),
            });
            
            useCustomTokens = orgSettings?.aiSettings?.useCustomTokens || false;
          }
        }
      } catch (sessionError) {
        console.error('Error getting session:', sessionError);
      }
    }
    
    return { organizationId, useCustomTokens };
  } catch (error) {
    console.error('Error extracting token settings:', error);
    return {};
  }
} 