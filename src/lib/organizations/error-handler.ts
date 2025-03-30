import { OrganizationAuthError, handleAuthError } from '@/lib/auth/error-handler';
import { TRPCError } from '@trpc/server';

/**
 * Handle organization-related errors in a consistent way
 * @param error The error to handle
 * @param organizationId Optional organization ID for context
 * @returns A TRPCError if the error should be propagated, or void if handled
 */
export function handleOrganizationError(error: unknown, organizationId?: string): TRPCError | void {
  console.error('Organization error:', error);
  
  // If it's already a TRPCError, just return it
  if (error instanceof TRPCError) {
    return error;
  }
  
  // If it's an OrganizationAuthError, convert it to a TRPCError with UNAUTHORIZED code
  if (error instanceof OrganizationAuthError) {
    return new TRPCError({
      code: 'UNAUTHORIZED',
      message: error.message,
      cause: error,
    });
  }
  
  // If it's a regular Error with a message about organization not found
  if (error instanceof Error && error.message.includes('Organization not found')) {
    return new TRPCError({
      code: 'NOT_FOUND',
      message: error.message,
      cause: error,
    });
  }
  
  // For other errors, create a generic internal server error
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    cause: error,
  });
}

/**
 * Safely get an organization ID from a request or throw an appropriate error
 * @param organizationId The organization ID to validate
 * @throws {OrganizationAuthError} If the organization ID is invalid
 */
export function validateOrganizationId(organizationId: unknown): string {
  if (!organizationId) {
    throw new OrganizationAuthError('No organization ID provided');
  }
  
  if (typeof organizationId !== 'string') {
    throw new OrganizationAuthError('Invalid organization ID format');
  }
  
  return organizationId;
} 