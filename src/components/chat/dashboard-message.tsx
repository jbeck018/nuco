import React from 'react';
import { DashboardContainer } from '@/lib/ai/agents/dashboard/components/DashboardContainer';
import { DashboardReportingAgent } from '@/lib/ai/agents/dashboard/base';
import { AIService } from '@/lib/ai/service';

interface DashboardMessageProps {
  messageId: string;
  agent: DashboardReportingAgent;
  onError?: (error: Error) => void;
  onUpdate?: (data: any) => void;
}

export const DashboardMessage: React.FC<DashboardMessageProps> = ({
  messageId,
  agent,
  onError,
  onUpdate,
}) => {
  return (
    <div className="dashboard-message my-4 rounded-lg border bg-card p-4">
      <DashboardContainer
        agent={agent}
        refreshInterval={30000} // Refresh every 30 seconds
        onError={onError}
        onUpdate={onUpdate}
      />
    </div>
  );
}; 