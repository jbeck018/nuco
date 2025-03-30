import { BaseAgent, AgentConfig, AgentContext, AgentResult } from '../base';
import { AIService } from '../../service';
import { ChartConfig, ChartType, DashboardConfig, DataPoint, DataSeries } from './types';

export class DashboardReportingAgent extends BaseAgent {
  private chartConfigs: Map<string, ChartConfig> = new Map();
  private dashboardConfig: DashboardConfig | null = null;

  constructor(aiService: AIService) {
    const defaultConfig: AgentConfig = {
      id: 'dashboard-reporting',
      name: 'Dashboard Reporting Agent',
      description: 'Agent for generating and managing dashboard reports and charts',
      model: 'gpt-4',
      aiService,
      enabled: true,
      maxRetries: 3,
      timeout: 30000,
      metadata: {}
    };
    super(defaultConfig);
  }

  /**
   * Executes the dashboard reporting agent's main functionality
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const input = context.data;
      
      // Process the input and return appropriate dashboard data
      if (typeof input === 'string') {
        if (input.startsWith('get_chart_')) {
          const chartId = input.replace('get_chart_', '');
          const config = this.chartConfigs.get(chartId);
          if (!config) {
            throw new Error(`Chart ${chartId} not found`);
          }
          return {
            success: true,
            output: config,
            metadata: {}
          };
        }

        if (input === 'get_dashboard') {
          return {
            success: true,
            output: this.dashboardConfig,
            metadata: {}
          };
        }
      }

      if (input && typeof input === 'object' && 'type' in input && input.type === 'update_chart') {
        const updateInput = input as { type: 'update_chart'; chartId: string; data: DataPoint[] };
        const { chartId, data } = updateInput;
        const result = await this.processChartData(chartId, data);
        return {
          success: true,
          output: result,
          metadata: {}
        };
      }

      throw new Error('Invalid input for dashboard reporting agent');
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error as Error,
        metadata: {}
      };
    }
  }

  /**
   * Creates a new chart configuration
   */
  async createChart(config: ChartConfig): Promise<string> {
    const chartId = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.chartConfigs.set(chartId, config);
    return chartId;
  }

  /**
   * Updates an existing chart configuration
   */
  async updateChart(chartId: string, config: Partial<ChartConfig>): Promise<void> {
    const existingConfig = this.chartConfigs.get(chartId);
    if (!existingConfig) {
      throw new Error(`Chart ${chartId} not found`);
    }
    this.chartConfigs.set(chartId, { ...existingConfig, ...config });
  }

  /**
   * Deletes a chart configuration
   */
  async deleteChart(chartId: string): Promise<void> {
    this.chartConfigs.delete(chartId);
  }

  /**
   * Creates or updates the dashboard configuration
   */
  async setDashboardConfig(config: DashboardConfig): Promise<void> {
    this.dashboardConfig = config;
  }

  /**
   * Processes data for a specific chart
   */
  async processChartData(chartId: string, data: DataPoint[]): Promise<DataSeries> {
    const config = this.chartConfigs.get(chartId);
    if (!config) {
      throw new Error(`Chart ${chartId} not found`);
    }

    // Process data based on chart type
    switch (config.type) {
      case ChartType.LINE:
        return this.processLineChartData(data, config);
      case ChartType.BAR:
        return this.processBarChartData(data, config);
      case ChartType.PIE:
        return this.processPieChartData(data, config);
      default:
        throw new Error(`Unsupported chart type: ${config.type}`);
    }
  }

  /**
   * Processes data for a line chart
   */
  private async processLineChartData(data: DataPoint[], config: ChartConfig): Promise<DataSeries> {
    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      labels: sortedData.map(d => d.timestamp.toISOString()),
      datasets: [{
        label: config.title,
        data: sortedData.map(d => d.value),
        borderColor: config.color || '#4F46E5',
        backgroundColor: config.color || '#4F46E5',
        tension: 0.4,
      }],
    };
  }

  /**
   * Processes data for a bar chart
   */
  private async processBarChartData(data: DataPoint[], config: ChartConfig): Promise<DataSeries> {
    // Group data by category if specified
    const groupedData = config.categoryField
      ? this.groupDataByCategory(data, config.categoryField)
      : { [config.title]: data };

    return {
      labels: Object.keys(groupedData),
      datasets: [{
        label: config.title,
        data: Object.values(groupedData).map(d => d.reduce((sum, point) => sum + point.value, 0)),
        backgroundColor: config.color || '#4F46E5',
      }],
    };
  }

  /**
   * Processes data for a pie chart
   */
  private async processPieChartData(data: DataPoint[], config: ChartConfig): Promise<DataSeries> {
    if (!config.categoryField) {
      throw new Error('Category field is required for pie charts');
    }

    const groupedData = this.groupDataByCategory(data, config.categoryField);

    return {
      labels: Object.keys(groupedData),
      datasets: [{
        label: config.title,
        data: Object.values(groupedData).map(d => d.reduce((sum, point) => sum + point.value, 0)),
        backgroundColor: this.generateColors(Object.keys(groupedData).length),
      }],
    };
  }

  /**
   * Groups data by a category field
   */
  private groupDataByCategory(data: DataPoint[], categoryField: string): Record<string, DataPoint[]> {
    return data.reduce((acc, point) => {
      const category = point.metadata?.[categoryField] || 'Unknown';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(point);
      return acc;
    }, {} as Record<string, DataPoint[]>);
  }

  /**
   * Generates an array of colors for charts
   */
  private generateColors(count: number): string[] {
    const colors = [
      '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#D946EF',
    ];
    return Array(count).fill(0).map((_, i) => colors[i % colors.length]);
  }

  /**
   * Gets the current dashboard configuration
   */
  getDashboardConfig(): DashboardConfig | null {
    return this.dashboardConfig;
  }

  /**
   * Gets all chart configurations
   */
  getChartConfigs(): Map<string, ChartConfig> {
    return this.chartConfigs;
  }
} 