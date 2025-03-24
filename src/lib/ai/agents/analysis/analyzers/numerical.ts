import { NumericalAnalysisConfig, AnalysisResult, InsightType } from '../types';
import { AIServiceError } from '../../../error';
import { BaseAgent, AgentConfig, AgentContext, AgentResult } from '../../base';
import { Message } from '../../../service';
import { Redis } from '@upstash/redis';
import { db } from '@/lib/db';
import { numericalAnalysisResults } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AIService } from '../../../service';

interface NumericalAnalysisMetadata {
  status: 'completed' | 'skipped';
  timestamp: string;
  dataPoints?: number;
  reason?: string;
  source?: 'cache' | 'analysis' | 'r2' | 'crm';
  dataSource?: {
    type: 'r2' | 'crm';
    backupDate?: string;
    queryTimestamp?: string;
  };
}

interface CRMDataQuery {
  startDate?: string;
  endDate?: string;
  entityType: 'contacts' | 'companies' | 'deals' | 'activities';
  fields: string[];
  filters?: Record<string, unknown>;
}

export class NumericalAnalyzer extends BaseAgent {
  private numericalConfig: NumericalAnalysisConfig;
  private redis!: Redis;
  private cacheTTL: number = 3600; // 1 hour default
  private r2Client: S3Client;
  private r2Bucket: string;

  constructor() {
    const config: AgentConfig = {
      id: 'numerical-analyzer',
      name: 'Numerical Analyzer',
      description: 'Agent for analyzing numerical data',
      model: 'gpt-4',
      aiService: new AIService(), // Will be overridden in initialize
    };
    super(config);
    this.numericalConfig = {
      enabled: false,
    };
    this.r2Client = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
      },
    });
    this.r2Bucket = process.env.CLOUDFLARE_R2_BUCKET || '';
  }

  async initialize(config: AgentConfig & { numericalConfig?: NumericalAnalysisConfig }): Promise<void> {
    await super.initialize(config);
    if (config.numericalConfig) {
      this.numericalConfig = config.numericalConfig;
    }
    
    // Initialize Redis connection
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL || '',
      token: process.env.UPSTASH_REDIS_TOKEN || '',
    });
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const data = context.metadata.data as unknown;
      const cacheKey = this.generateCacheKey(data, context.metadata);
      
      // Check cache first
      const cachedResult = await this.redis.get(cacheKey);
      if (cachedResult) {
        return {
          success: true,
          output: cachedResult,
          metadata: {
            ...context.metadata,
            numericalAnalysis: {
              status: 'completed',
              timestamp: new Date().toISOString(),
              source: 'cache',
            } as NumericalAnalysisMetadata,
          },
        };
      }

      const results = await this.analyze(data, this.numericalConfig);

      // Cache results
      await this.redis.set(cacheKey, results, { ex: this.cacheTTL });

      // Store results in database for persistence
      if (context.metadata.id) {
        await this.storeResults(context.metadata.id as string, results);
      }

      return {
        success: true,
        output: results,
        metadata: {
          ...context.metadata,
          numericalAnalysis: {
            status: 'completed',
            timestamp: new Date().toISOString(),
            source: 'analysis',
          } as NumericalAnalysisMetadata,
        },
      };
    } catch (error) {
      await this.handleError(error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: context.metadata,
      };
    }
  }

  private generateCacheKey(data: unknown, metadata: Record<string, unknown>): string {
    const dataHash = JSON.stringify(data);
    const metadataHash = JSON.stringify(metadata);
    return `numerical_analysis:${dataHash}:${metadataHash}`;
  }

  private async storeResults(analysisId: string, results: Partial<AnalysisResult>): Promise<void> {
    try {
      await db.insert(numericalAnalysisResults).values({
        analysisId,
        metrics: results.metrics || {},
        insights: results.insights || [],
        metadata: results.metadata || {},
      });
    } catch (error) {
      console.error('Failed to store numerical analysis results:', error);
      // Don't throw here, as this is a non-critical operation
    }
  }

  private async queryHistoricalData(query: CRMDataQuery): Promise<unknown[]> {
    try {
      // List available backups
      const listCommand = new ListObjectsV2Command({
        Bucket: this.r2Bucket,
        Prefix: `crm-backups/${query.entityType}/`,
      });
      const backups = await this.r2Client.send(listCommand);

      if (!backups.Contents) {
        return [];
      }

      // Find relevant backups based on date range
      const relevantBackups = backups.Contents
        .filter(obj => {
          const backupDate = obj.Key?.split('/').pop()?.split('.')[0];
          if (!backupDate) return false;
          const date = new Date(backupDate);
          return (!query.startDate || date >= new Date(query.startDate)) &&
                 (!query.endDate || date <= new Date(query.endDate));
        })
        .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));

      const results: unknown[] = [];

      // Process each relevant backup
      for (const backup of relevantBackups) {
        if (!backup.Key) continue;

        const getCommand = new GetObjectCommand({
          Bucket: this.r2Bucket,
          Key: backup.Key,
        });
        const url = await getSignedUrl(this.r2Client, getCommand, { expiresIn: 3600 });
        const response = await fetch(url);
        const data = await response.json();

        // Filter and transform data based on query
        const filteredData = data.filter((item: unknown) => {
          if (!query.filters) return true;
          return Object.entries(query.filters).every(([key, value]) => 
            (item as Record<string, unknown>)[key] === value
          );
        });

        // Select requested fields
        const transformedData = filteredData.map((item: unknown) => {
          const record = item as Record<string, unknown>;
          return query.fields.reduce((acc, field) => {
            acc[field] = record[field];
            return acc;
          }, {} as Record<string, unknown>);
        });

        results.push(...transformedData);
      }

      return results;
    } catch (error) {
      console.error('Failed to query historical data:', error);
      return [];
    }
  }

  private async queryCurrentCRMData(query: CRMDataQuery): Promise<unknown[]> {
    try {
      // This would be implemented based on the specific CRM API
      // For now, we'll return an empty array as a placeholder
      return [];
    } catch (error) {
      console.error('Failed to query current CRM data:', error);
      return [];
    }
  }

  async analyze(data: unknown, config: NumericalAnalysisConfig): Promise<Partial<AnalysisResult>> {
    try {
      let numbers: number[] = [];
      const metadata: NumericalAnalysisMetadata = {
        status: 'completed',
        timestamp: new Date().toISOString(),
      };

      // If data is a CRM query, fetch the data
      if (typeof data === 'object' && data !== null && 'entityType' in data) {
        const query = data as CRMDataQuery;
        
        // Query historical data from R2
        const historicalData = await this.queryHistoricalData(query);
        metadata.dataSource = {
          type: 'r2',
          backupDate: new Date().toISOString(),
        };

        // Query current data from CRM
        const currentData = await this.queryCurrentCRMData(query);
        metadata.dataSource = {
          type: 'crm',
          queryTimestamp: new Date().toISOString(),
        };

        // Combine and process the data
        const combinedData = [...historicalData, ...currentData];
        numbers = this.extractNumbers(combinedData);
      } else {
        numbers = this.extractNumbers(data);
      }

      if (!numbers || numbers.length === 0) {
        return {
          insights: [],
          metrics: {},
          metadata: {
            numericalAnalysis: {
              status: 'skipped',
              reason: 'no_numerical_data',
            } as NumericalAnalysisMetadata,
          },
        };
      }

      const results: Partial<AnalysisResult> = {
        insights: [],
        metrics: {},
        metadata: {
          numericalAnalysis: {
            ...metadata,
            dataPoints: numbers.length,
          },
        },
      };

      // Perform aggregation if enabled
      if (config.aggregation?.functions) {
        const aggregationResults = await this.aggregateData(numbers, config.aggregation);
        
        // Add aggregation metrics
        if (results.metrics) {
          Object.assign(results.metrics, aggregationResults.metrics);
        }

        // Add aggregation insights
        if (results.insights) {
          results.insights.push(...aggregationResults.insights);
        }
      }

      // Perform correlation analysis if enabled
      if (config.correlation?.enabled) {
        const correlationResults = await this.analyzeCorrelations(numbers, config.correlation);
        
        // Add correlation metrics
        if (results.metrics) {
          Object.assign(results.metrics, correlationResults.metrics);
        }

        // Add correlation insights
        if (results.insights) {
          results.insights.push(...correlationResults.insights);
        }
      }

      // Perform forecasting if enabled
      if (config.forecasting?.enabled) {
        const forecastingResults = await this.forecastValues(numbers, config.forecasting);
        
        // Add forecasting metrics
        if (results.metrics) {
          Object.assign(results.metrics, forecastingResults.metrics);
        }

        // Add forecasting insights
        if (results.insights) {
          results.insights.push(...forecastingResults.insights);
        }
      }

      // Add performance metrics
      if (results.metrics) {
        const metadata = results.metadata?.numericalAnalysis as NumericalAnalysisMetadata;
        const startTime = new Date(metadata?.timestamp || new Date().toISOString()).getTime();
        results.metrics.analysisTime = Date.now() - startTime;
        results.metrics.memoryUsage = process.memoryUsage().heapUsed;
      }

      return results;
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Failed to analyze numerical data',
        'custom',
        'numerical_analysis_error'
      );
    }
  }

  private extractNumbers(data: unknown): number[] {
    if (typeof data === 'number') return [data];
    if (Array.isArray(data)) {
      return data.flatMap(item => this.extractNumbers(item));
    }
    if (typeof data === 'object' && data !== null) {
      return Object.values(data).flatMap(value => this.extractNumbers(value));
    }
    return [];
  }

  private async aggregateData(
    numbers: number[],
    config: NumericalAnalysisConfig['aggregation']
  ): Promise<{
    metrics: Record<string, number>;
    insights: Array<{
      type: InsightType;
      title: string;
      description: string;
      confidence: number;
      data: unknown;
      recommendations?: string[];
    }>;
  }> {
    if (!config) {
      throw new AIServiceError(
        'Aggregation config is required',
        'custom',
        'aggregation_config_error'
      );
    }

    const metrics: Record<string, number> = {};
    const insights = [];

    // Calculate requested aggregation functions
    for (const func of config.functions) {
      let value: number;
      let description: string;

      switch (func) {
        case 'mean':
          value = numbers.reduce((a, b) => a + b, 0) / numbers.length;
          description = 'Average value';
          break;
        case 'median':
          const sorted = [...numbers].sort((a, b) => a - b);
          value = sorted[Math.floor(sorted.length / 2)];
          description = 'Middle value';
          break;
        case 'mode':
          const counts = new Map<number, number>();
          numbers.forEach(n => counts.set(n, (counts.get(n) || 0) + 1));
          value = Array.from(counts.entries()).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
          description = 'Most frequent value';
          break;
        case 'std':
          const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
          value = Math.sqrt(
            numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length
          );
          description = 'Standard deviation';
          break;
        case 'min':
          value = Math.min(...numbers);
          description = 'Minimum value';
          break;
        case 'max':
          value = Math.max(...numbers);
          description = 'Maximum value';
          break;
        default:
          continue;
      }

      metrics[func] = value;
      insights.push({
        type: InsightType.Trend,
        title: `${func.charAt(0).toUpperCase() + func.slice(1)} Analysis`,
        description: `${description}: ${value.toFixed(2)}`,
        confidence: 0.9,
        data: {
          value,
          function: func,
        },
      });
    }

    // Perform grouped analysis if enabled
    if (config.groupBy && config.groupBy.length > 0) {
      const groupedResults = await this.analyzeGroupedStatistics(numbers, config);
      Object.assign(metrics, groupedResults.metrics);
      insights.push(...groupedResults.insights);
    }

    return { metrics, insights };
  }

  private async analyzeGroupedStatistics(
    numbers: number[],
    config: NumericalAnalysisConfig['aggregation']
  ): Promise<{
    metrics: Record<string, number>;
    insights: Array<{
      type: InsightType;
      title: string;
      description: string;
      confidence: number;
      data: unknown;
      recommendations?: string[];
    }>;
  }> {
    if (!config) {
      throw new AIServiceError(
        'Grouped analysis config is required',
        'custom',
        'grouped_analysis_config_error'
      );
    }

    const metrics: Record<string, number> = {};
    const insights = [];

    // Group data by specified fields
    const groups = new Map<string, number[]>();
    for (const field of config.groupBy || []) {
      // Implementation for grouping by field
      // This would depend on the data structure and field types
      // For now, we'll just use a simple example
      const groupKey = field;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, numbers);
      }
    }

    // Calculate statistics for each group
    for (const [groupKey, groupNumbers] of groups) {
      const groupMetrics: Record<string, number> = {};
      const groupInsights = [];

      for (const func of config.functions) {
        let value: number;
        let description: string;

        switch (func) {
          case 'mean':
            value = groupNumbers.reduce((a, b) => a + b, 0) / groupNumbers.length;
            description = 'Average value';
            break;
          case 'median':
            const sorted = [...groupNumbers].sort((a, b) => a - b);
            value = sorted[Math.floor(sorted.length / 2)];
            description = 'Middle value';
            break;
          case 'mode':
            const counts = new Map<number, number>();
            groupNumbers.forEach(n => counts.set(n, (counts.get(n) || 0) + 1));
            value = Array.from(counts.entries()).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
            description = 'Most frequent value';
            break;
          case 'std':
            const mean = groupNumbers.reduce((a, b) => a + b, 0) / groupNumbers.length;
            value = Math.sqrt(
              groupNumbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / groupNumbers.length
            );
            description = 'Standard deviation';
            break;
          case 'min':
            value = Math.min(...groupNumbers);
            description = 'Minimum value';
            break;
          case 'max':
            value = Math.max(...groupNumbers);
            description = 'Maximum value';
            break;
          default:
            continue;
        }

        const metricKey = `${groupKey}_${func}`;
        groupMetrics[metricKey] = value;
        groupInsights.push({
          type: InsightType.Trend,
          title: `${groupKey} - ${func.charAt(0).toUpperCase() + func.slice(1)}`,
          description: `${description}: ${value.toFixed(2)}`,
          confidence: 0.9,
          data: {
            value,
            function: func,
            group: groupKey,
          },
        });
      }

      Object.assign(metrics, groupMetrics);
      insights.push(...groupInsights);
    }

    return { metrics, insights };
  }

  private async analyzeCorrelations(
    numbers: number[],
    config: NumericalAnalysisConfig['correlation']
  ): Promise<{
    metrics: Record<string, number>;
    insights: Array<{
      type: InsightType;
      title: string;
      description: string;
      confidence: number;
      data: unknown;
      recommendations?: string[];
    }>;
  }> {
    if (!config) {
      throw new AIServiceError(
        'Correlation config is required',
        'custom',
        'correlation_config_error'
      );
    }

    const metrics: Record<string, number> = {};
    const insights = [];

    // Calculate correlations using requested methods
    for (const method of config.methods) {
      let correlation: number;
      let description: string;

      switch (method) {
        case 'pearson':
          // Implement Pearson correlation
          correlation = 0; // Placeholder
          description = 'Pearson correlation coefficient';
          break;
        case 'spearman':
          // Implement Spearman correlation
          correlation = 0; // Placeholder
          description = 'Spearman correlation coefficient';
          break;
        case 'kendall':
          // Implement Kendall correlation
          correlation = 0; // Placeholder
          description = 'Kendall correlation coefficient';
          break;
        default:
          continue;
      }

      if (Math.abs(correlation) >= config.minConfidence) {
        metrics[`correlation_${method}`] = correlation;
        insights.push({
          type: InsightType.Correlation,
          title: `${method.charAt(0).toUpperCase() + method.slice(1)} Correlation`,
          description: `${description}: ${correlation.toFixed(2)}`,
          confidence: Math.abs(correlation),
          data: {
            value: correlation,
            method,
          },
        });
      }
    }

    return { metrics, insights };
  }

  private async forecastValues(
    numbers: number[],
    config: NumericalAnalysisConfig['forecasting']
  ): Promise<{
    metrics: Record<string, number>;
    insights: Array<{
      type: InsightType;
      title: string;
      description: string;
      confidence: number;
      data: unknown;
      recommendations?: string[];
    }>;
  }> {
    if (!config) {
      throw new AIServiceError(
        'Forecasting config is required',
        'custom',
        'forecasting_config_error'
      );
    }

    const metrics: Record<string, number> = {};
    const insights = [];

    // Generate forecasts using requested methods
    for (const method of config.methods) {
      let forecast: number;
      let description: string;

      switch (method) {
        case 'linear':
          // Implement linear regression
          forecast = 0; // Placeholder
          description = 'Linear regression forecast';
          break;
        case 'exponential':
          // Implement exponential smoothing
          forecast = 0; // Placeholder
          description = 'Exponential smoothing forecast';
          break;
        case 'seasonal':
          // Implement seasonal decomposition
          forecast = 0; // Placeholder
          description = 'Seasonal decomposition forecast';
          break;
        default:
          continue;
      }

      metrics[`forecast_${method}`] = forecast;
      insights.push({
        type: InsightType.Prediction,
        title: `${method.charAt(0).toUpperCase() + method.slice(1)} Forecast`,
        description: `${description}: ${forecast.toFixed(2)}`,
        confidence: 0.8,
        data: {
          value: forecast,
          method,
          horizon: config.horizon,
        },
      });
    }

    return { metrics, insights };
  }
} 