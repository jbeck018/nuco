import { ChartConfig, ChartType, DataPoint, DataSeries } from './types';
import { Chart, ChartConfiguration, ChartOptions, ChartTypeRegistry } from 'chart.js';
import {
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale,
  TimeScale,
  TimeSeriesScale,
  Decimation,
  LogarithmicScale,
  ScatterController,
  BubbleController,
  PolarAreaController,
  DoughnutController,
  PieController,
  BarController,
  LineController,
} from 'chart.js';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale,
  TimeScale,
  TimeSeriesScale,
  Decimation,
  LogarithmicScale,
  ScatterController,
  BubbleController,
  PolarAreaController,
  DoughnutController,
  PieController,
  BarController,
  LineController
);

export class ChartRenderer {
  private static instance: ChartRenderer;
  private charts: Map<string, Chart> = new Map();

  private constructor() {}

  static getInstance(): ChartRenderer {
    if (!ChartRenderer.instance) {
      ChartRenderer.instance = new ChartRenderer();
    }
    return ChartRenderer.instance;
  }

  /**
   * Creates or updates a chart with the given configuration and data
   */
  async renderChart(
    canvasId: string,
    config: ChartConfig,
    data: DataSeries
  ): Promise<void> {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id ${canvasId} not found`);
    }

    // Destroy existing chart if it exists
    const existingChart = this.charts.get(canvasId);
    if (existingChart) {
      existingChart.destroy();
    }

    // Create chart configuration
    const chartConfig = this.createChartConfig(config, data);
    
    // Create and store new chart
    const chart = new Chart(canvas, chartConfig);
    this.charts.set(canvasId, chart);
  }

  /**
   * Creates a Chart.js configuration object
   */
  private createChartConfig(
    config: ChartConfig,
    data: DataSeries
  ): ChartConfiguration {
    const options: ChartOptions = {
      responsive: config.responsive ?? true,
      maintainAspectRatio: config.maintainAspectRatio ?? false,
      animation: config.animation ? {
        duration: 1000,
        easing: 'easeInOutQuart'
      } : false,
      plugins: {
        legend: {
          display: config.showLegend ?? true,
          position: 'top' as const,
        },
        title: {
          display: true,
          text: config.title,
          font: {
            size: 16,
            family: config.theme?.fontFamily,
          },
        },
      },
      scales: this.createScales(config),
    };

    return {
      type: config.type as keyof ChartTypeRegistry,
      data: {
        labels: data.labels,
        datasets: data.datasets.map(dataset => ({
          ...dataset,
          borderColor: dataset.borderColor || config.color,
          backgroundColor: dataset.backgroundColor || config.color,
        })),
      },
      options,
    };
  }

  /**
   * Creates scale configurations based on chart type
   */
  private createScales(config: ChartConfig): any {
    const scales: Record<string, any> = {};

    switch (config.type) {
      case ChartType.LINE:
      case ChartType.BAR:
      case ChartType.SCATTER:
      case ChartType.BUBBLE:
        scales.x = {
          type: 'linear',
          title: {
            display: !!config.xAxisLabel,
            text: config.xAxisLabel,
          },
        };
        scales.y = {
          type: 'linear',
          title: {
            display: !!config.yAxisLabel,
            text: config.yAxisLabel,
          },
        };
        break;

      case ChartType.RADAR:
      case ChartType.POLAR_AREA:
        scales.r = {
          type: 'radialLinear',
          beginAtZero: true,
        };
        break;

      case ChartType.PIE:
      case ChartType.DOUGHNUT:
        // No scales needed for pie/doughnut charts
        break;
    }

    return scales;
  }

  /**
   * Destroys a chart by its canvas ID
   */
  destroyChart(canvasId: string): void {
    const chart = this.charts.get(canvasId);
    if (chart) {
      chart.destroy();
      this.charts.delete(canvasId);
    }
  }

  /**
   * Destroys all charts
   */
  destroyAllCharts(): void {
    for (const [canvasId] of this.charts) {
      this.destroyChart(canvasId);
    }
  }
} 