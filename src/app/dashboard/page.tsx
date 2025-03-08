export const runtime = 'edge';

import { Suspense } from 'react';
import { preload, parallelFetch } from '@/lib/server-utils';
import { auth } from '@/lib/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { getRecentChats } from '@/lib/chat/recent';
import { getIntegrationStats } from '@/lib/integrations/stats';
import { getOrganizationDetails } from '@/lib/organizations/details';
import { DashboardCards } from '@/components/dashboard/dashboard-cards';
import { ErrorBoundary } from '@/components/error-boundary';

// Metadata for the page
export const metadata = {
  title: 'Dashboard | Nuco',
  description: 'View your Nuco dashboard with AI-powered insights and integrations.',
};

// Preload data for the dashboard
async function preloadDashboardData(userId: string, organizationId: string) {
  return parallelFetch(
    getIntegrationStats(organizationId),
    getRecentChats(userId, 5),
    getOrganizationDetails(organizationId)
  );
}

export default async function DashboardPage() {
  // Get the user session
  const session = await auth();
  
  if (!session?.user) {
    return null; // Handled by middleware
  }
  
  const userId = session.user.id;
  const organizationId = session.user.defaultOrganizationId || '';
  
  // Preload data for the dashboard
  const dataPromise = preloadDashboardData(userId, organizationId);
  preload(dataPromise);
  
  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="Overview of your AI-powered integrations and recent activity."
      />
      
      <ErrorBoundary fallback={<DashboardError />}>
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent dataPromise={dataPromise} />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

// Define the return types for clarity
type IntegrationStatsType = Awaited<ReturnType<typeof getIntegrationStats>>;
type RecentChatsType = Awaited<ReturnType<typeof getRecentChats>>;
type OrganizationDetailsType = Awaited<ReturnType<typeof getOrganizationDetails>>;

// Separate component to handle the async data
async function DashboardContent({ 
  dataPromise 
}: { 
  dataPromise: Promise<[
    IntegrationStatsType,
    RecentChatsType,
    OrganizationDetailsType
  ]> 
}) {
  try {
    // Wait for all data to load in parallel
    const [integrationStats, recentChats, orgDetails] = await dataPromise;
    
    return (
      <DashboardCards
        integrationStats={integrationStats}
        recentChats={recentChats}
        organizationDetails={orgDetails}
      />
    );
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    return <DashboardError />;
  }
}

// Error component for the dashboard
function DashboardError() {
  return (
    <div className="rounded-lg border border-destructive p-6 my-6">
      <h3 className="text-lg font-medium text-destructive">Error Loading Dashboard</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        There was an error loading your dashboard data. Please try refreshing the page or contact support if the problem persists.
      </p>
      <div className="mt-4">
        <button 
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
} 