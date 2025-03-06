import { Suspense } from 'react';
import { preload, parallelFetch } from '@/lib/server-utils';
import { auth } from '@/lib/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { getRecentChats } from '@/lib/chat/recent';
import { getIntegrationStats } from '@/lib/integrations/stats';
import { getOrganizationDetails } from '@/lib/organizations/details';
import { DashboardShell } from '@/components/dashboard/shell';
import { DashboardCards } from '@/components/dashboard/dashboard-cards';

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
    <DashboardShell>
      <DashboardHeader
        title="Dashboard"
        description="Overview of your AI-powered integrations and recent activity."
      />
      
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent dataPromise={dataPromise} />
      </Suspense>
    </DashboardShell>
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
  // Wait for all data to load in parallel
  const [integrationStats, recentChats, orgDetails] = await dataPromise;
  
  return (
    <DashboardCards
      integrationStats={integrationStats}
      recentChats={recentChats}
      organizationDetails={orgDetails}
    />
  );
} 