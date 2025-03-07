import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';

export default function DashboardLoading() {
  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="Overview of your AI-powered integrations and recent activity."
      />
      <DashboardSkeleton />
    </>
  );
} 