import { signOut } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";

/**
 * AuthError class for handling authentication-related errors
 * This class extends Error and provides additional functionality for auth errors
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * OrganizationAuthError class for handling organization-related authentication errors
 * This class extends AuthError and provides specific handling for organization access issues
 */
export class OrganizationAuthError extends AuthError {
  organizationId?: string;

  constructor(message: string, organizationId?: string) {
    super(message);
    this.name = 'OrganizationAuthError';
    this.organizationId = organizationId;
  }
}

/**
 * Handle authentication errors by logging the user out and redirecting to signup
 * @param error The error to handle
 * @param redirectPath Optional path to redirect to (defaults to /auth/signup)
 */
export async function handleAuthError(error: Error, redirectPath = '/auth/signup'): Promise<void> {
  console.error('Authentication error:', error);
  
  // Show toast notification
  toast({
    variant: "destructive",
    title: "Authentication Error",
    description: error.message || "You've been logged out due to an authentication issue.",
  });
  
  // Sign the user out without redirecting yet
  await signOut({ redirect: false });
  
  // Redirect to the specified path (default: signup page)
  window.location.href = redirectPath;
}

/**
 * Utility function to throw an organization not found error
 * @param organizationId The ID of the organization that wasn't found
 */
export function throwOrganizationNotFoundError(organizationId: string): never {
  throw new OrganizationAuthError(`Organization not found: ${organizationId}`, organizationId);
} 