import React, { useEffect, useRef } from 'react';
import { ChartConfig, DataSeries } from '../types';
import { ChartRenderer } from '../chart';

interface ChartProps {
  id: string;
  config: ChartConfig;
  data: DataSeries;
  className?: string;
  style?: React.CSSProperties;
}

export const Chart: React.FC<ChartProps> = ({
  id,
  config,
  data,
  className,
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRenderer = ChartRenderer.getInstance();

  useEffect(() => {
    if (canvasRef.current) {
      const canvasId = `chart-${id}`;
      canvasRef.current.id = canvasId;
      
      chartRenderer.renderChart(canvasId, config, data).catch(console.error);

      return () => {
        chartRenderer.destroyChart(canvasId);
      };
    }
  }, [id, config, data, chartRenderer]);

  return (
    <div className={className} style={style}>
      <canvas ref={canvasRef} />
    </div>
  );
}; 