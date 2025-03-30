'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthError, OrganizationAuthError, handleAuthError } from '@/lib/auth/error-handler';

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AuthErrorBoundary component
 * 
 * This component catches authentication errors and handles them by logging the user out
 * and redirecting to the signup page.
 */
export function AuthErrorBoundary({ children, fallback }: AuthErrorBoundaryProps) {
  const router = useRouter();

  useEffect(() => {
    // Add a global error handler for uncaught errors
    const handleGlobalError = async (event: ErrorEvent) => {
      const error = event.error;
      
      // Check if this is an authentication error
      if (error instanceof AuthError || 
          (error instanceof Error && 
           (error.message.includes('not authenticated') || 
            error.message.includes('Organization not found')))) {
        
        // Prevent the default error handling
        event.preventDefault();
        
        // Handle the authentication error
        await handleAuthError(error);
      }
    };

    // Add the event listener
    window.addEventListener('error', handleGlobalError);

    // Clean up the event listener
    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, [router]);

  return <>{children}</>;
}

/**
 * withAuthErrorHandling HOC
 * 
 * This higher-order component wraps a component with error handling for authentication errors.
 * It catches authentication errors and handles them by logging the user out and redirecting to the signup page.
 */
export function withAuthErrorHandling<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function WithAuthErrorHandling(props: P) {
    return (
      <AuthErrorBoundary>
        <Component {...props} />
      </AuthErrorBoundary>
    );
  };
} 