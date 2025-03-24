import { useState, useEffect, useCallback } from 'react';
import { DashboardConfig, ChartConfig, DataSeries } from '../types';
import { DashboardReportingAgent } from '../base';
import { AgentContext } from '../../base';

interface UseDashboardOptions {
  refreshInterval?: number;
  onError?: (error: Error) => void;
  onUpdate?: (data: Map<string, DataSeries>) => void;
}

export const useDashboard = (
  agent: DashboardReportingAgent,
  options: UseDashboardOptions = {}
) => {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [chartData, setChartData] = useState<Map<string, DataSeries>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Create a base context for agent execution
  const createContext = useCallback((data: any): AgentContext => ({
    messages: [],
    state: agent.getState(),
    config: agent['config'],
    metadata: {},
    data,
    executionId: crypto.randomUUID(),
  }), [agent]);

  // Fetch dashboard configuration
  const fetchConfig = useCallback(async () => {
    try {
      const result = await agent.execute(createContext('get_dashboard'));
      if (result.success && result.output) {
        setConfig(result.output as DashboardConfig);
      } else {
        throw new Error('Failed to fetch dashboard configuration');
      }
    } catch (err) {
      setError(err as Error);
      options.onError?.(err as Error);
    }
  }, [agent, createContext, options]);

  // Fetch chart data
  const fetchChartData = useCallback(async () => {
    if (!config) return;

    try {
      setLoading(true);
      setError(null);

      const newChartData = new Map<string, DataSeries>();
      for (const chart of config.charts) {
        const chartConfig = agent.getChartConfigs().get(chart.id);
        if (!chartConfig) {
          console.warn(`Chart config not found for ${chart.id}`);
          continue;
        }

        const result = await agent.execute(createContext({
          type: 'update_chart',
          chartId: chart.id,
          data: [], // In a real implementation, you would pass actual data here
        }));

        if (result.success && result.output) {
          newChartData.set(chart.id, result.output as DataSeries);
        }
      }

      setChartData(newChartData);
      options.onUpdate?.(newChartData);
    } catch (err) {
      setError(err as Error);
      options.onError?.(err as Error);
    } finally {
      setLoading(false);
    }
  }, [config, options, agent, createContext]);

  // Initial data fetch
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Set up refresh interval
  useEffect(() => {
    if (!options.refreshInterval) return;

    const interval = setInterval(fetchChartData, options.refreshInterval);
    return () => clearInterval(interval);
  }, [options.refreshInterval, fetchChartData]);

  // Fetch chart data when config changes
  useEffect(() => {
    if (config) {
      fetchChartData();
    }
  }, [config, fetchChartData]);

  // Update chart configuration
  const updateChartConfig = useCallback(
    async (chartId: string, updates: Partial<ChartConfig>) => {
      try {
        await agent.updateChart(chartId, updates);
        await fetchChartData();
      } catch (err) {
        setError(err as Error);
        options.onError?.(err as Error);
      }
    },
    [agent, fetchChartData, options]
  );

  // Update dashboard configuration
  const updateDashboardConfig = useCallback(
    async (updates: Partial<DashboardConfig>) => {
      if (!config) return;

      try {
        await agent.setDashboardConfig({ ...config, ...updates });
        await fetchConfig();
      } catch (err) {
        setError(err as Error);
        options.onError?.(err as Error);
      }
    },
    [agent, config, fetchConfig, options]
  );

  return {
    config,
    chartData,
    loading,
    error,
    updateChartConfig,
    updateDashboardConfig,
    refresh: fetchChartData,
  };
}; 