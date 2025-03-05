/**
 * Integrations Page
 * 
 * This page displays all available integrations and allows users to connect/disconnect them.
 * It uses the tRPC client to fetch integration data and manage integration operations.
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { IntegrationsList } from './components/integrations-list';
import { IntegrationsHeader } from './components/integrations-header';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const metadata: Metadata = {
  title: 'Integrations | Nuco',
  description: 'Manage your integrations with external services',
};

/**
 * Integrations page component
 */
export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Get the user session
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/auth/login');
  }

  // Extract success and error messages from search params
  const successMessage = searchParams.success as string | undefined;
  const errorMessage = searchParams.error as string | undefined;

  return (
    <div className="container mx-auto py-8">
      <IntegrationsHeader 
        successMessage={successMessage} 
        errorMessage={errorMessage} 
      />
      
      <div className="mt-8">
        <Suspense fallback={<LoadingSpinner />}>
          {/* Pass null organizationId to show all user integrations */}
          <IntegrationsList />
        </Suspense>
      </div>
    </div>
  );
} 