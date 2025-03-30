export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  SCATTER = 'scatter',
  BUBBLE = 'bubble',
  RADAR = 'radar',
  POLAR_AREA = 'polarArea',
  DOUGHNUT = 'doughnut',
  HORIZONTAL_BAR = 'horizontalBar',
  STACKED_BAR = 'stackedBar',
  STACKED_AREA = 'stackedArea',
  CANDLESTICK = 'candlestick',
  HEATMAP = 'heatmap',
  BOX_PLOT = 'boxPlot',
  VIOLIN_PLOT = 'violinPlot'
}

export interface DataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface DataSeries {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string | string[];
    tension?: number;
    fill?: boolean;
    borderWidth?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
    pointHoverBackgroundColor?: string;
    pointHoverBorderColor?: string;
    pointHoverBorderWidth?: number;
    pointStyle?: string;
    rotation?: number;
    circumference?: number;
    cutout?: string;
    spacing?: number;
  }[];
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  description?: string;
  color?: string;
  categoryField?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  animation?: boolean;
  options?: Record<string, any>;
  theme?: {
    fontFamily?: string;
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
}

export interface DashboardConfig {
  id: string;
  title: string;
  description?: string;
  layout: {
    type: 'grid' | 'flex';
    columns?: number;
    rows?: number;
    gap?: number;
    padding?: number;
  };
  charts: {
    id: string;
    position: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  }[];
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
  };
  refreshInterval?: number;
  lastUpdated?: Date;
} 