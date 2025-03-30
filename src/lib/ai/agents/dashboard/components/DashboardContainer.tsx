import React from 'react';
import { Dashboard } from './Dashboard';
import { useDashboard } from '../hooks/useDashboard';
import { DashboardReportingAgent } from '../base';
import { DataSeries } from '../types';

interface DashboardContainerProps {
  agent: DashboardReportingAgent;
  refreshInterval?: number;
  className?: string;
  style?: React.CSSProperties;
  onError?: (error: Error) => void;
  onUpdate?: (data: Map<string, DataSeries>) => void;
}

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  agent,
  refreshInterval,
  className,
  style,
  onError,
  onUpdate,
}) => {
  const {
    config,
    chartData,
    loading,
    error,
    updateChartConfig,
    updateDashboardConfig,
    refresh,
  } = useDashboard(agent, {
    refreshInterval,
    onError,
    onUpdate,
  });

  if (loading) {
    return (
      <div className="dashboard-loading" style={{ padding: '2rem', textAlign: 'center' }}>
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error" style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        Error loading dashboard: {error.message}
      </div>
    );
  }

  if (!config) {
    return (
      <div className="dashboard-no-config" style={{ padding: '2rem', textAlign: 'center' }}>
        No dashboard configuration found
      </div>
    );
  }

  return (
    <Dashboard
      config={config}
      agent={agent}
      className={className}
      style={style}
    />
  );
}; 