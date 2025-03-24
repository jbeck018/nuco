import React, { useEffect, useState } from 'react';
import { Chart } from './Chart';
import { ChartConfig, DashboardConfig, DataSeries } from '../types';
import { DashboardReportingAgent } from '../base';

interface DashboardProps {
  config: DashboardConfig;
  agent: DashboardReportingAgent;
  className?: string;
  style?: React.CSSProperties;
}

export const Dashboard: React.FC<DashboardProps> = ({
  config,
  agent,
  className,
  style,
}) => {
  const [chartData, setChartData] = useState<Map<string, DataSeries>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch data for each chart
        const newChartData = new Map<string, DataSeries>();
        for (const chart of config.charts) {
          const chartConfig = agent.getChartConfigs().get(chart.id);
          if (!chartConfig) {
            console.warn(`Chart config not found for ${chart.id}`);
            continue;
          }

          // In a real implementation, you would fetch actual data here
          // For now, we'll use mock data
          const mockData: DataSeries = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
            datasets: [{
              label: chartConfig.title,
              data: [65, 59, 80, 81, 56],
              borderColor: chartConfig.color || '#4F46E5',
              backgroundColor: chartConfig.color || '#4F46E5',
            }],
          };

          newChartData.set(chart.id, mockData);
        }

        setChartData(newChartData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [config, agent]);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div>Error loading dashboard: {error.message}</div>;
  }

  return (
    <div
      className={`dashboard ${className || ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${config.layout.columns || 2}, 1fr)`,
        gap: config.layout.gap || '1rem',
        padding: config.layout.padding || '1rem',
        ...style,
      }}
    >
      {config.charts.map((chart) => {
        const chartConfig = agent.getChartConfigs().get(chart.id);
        const data = chartData.get(chart.id);

        if (!chartConfig || !data) {
          return null;
        }

        return (
          <div
            key={chart.id}
            style={{
              gridColumn: `span ${chart.position.w}`,
              gridRow: `span ${chart.position.h}`,
              minHeight: '300px',
            }}
          >
            <Chart
              id={chart.id}
              config={chartConfig}
              data={data}
              style={{
                width: '100%',
                height: '100%',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}; 