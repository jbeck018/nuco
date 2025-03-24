import { BaseAgent, AgentConfig, AgentContext, AgentResult } from '../base';
import { AIServiceError } from '@/lib/ai/error';
import { Redis } from '@upstash/redis';

export interface AnalysisConfig extends AgentConfig {
  redis: Redis;
  maxTokens?: number;
  temperature?: number;
  analysisType: 'text' | 'numerical' | 'pattern';
  dataSource: 'r2' | 'crm' | 'both';
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface AnalysisResult {
  summary: string;
  insights: string[];
  metrics: Record<string, number>;
  patterns: string[];
  recommendations: string[];
  metadata: {
    timestamp: string;
    dataPoints: number;
    confidence: number;
    processingTime: number;
  };
}

export abstract class BaseAnalysisAgent extends BaseAgent {
  protected readonly redis: Redis;
  protected readonly cacheTTL: number = 3600; // 1 hour

  constructor(config: AnalysisConfig) {
    super(config);
    this.redis = config.redis;
  }

  protected async validateConfig(config: AnalysisConfig): Promise<void> {
    if (!config.id || !config.id.startsWith('analysis-')) {
      throw new AIServiceError('Invalid agent ID. Must start with "analysis-"');
    }

    if (!config.name || !config.description) {
      throw new AIServiceError('Missing required configuration: name and description');
    }

    if (!['text', 'numerical', 'pattern'].includes(config.analysisType)) {
      throw new AIServiceError('Invalid analysis type. Must be one of: text, numerical, pattern');
    }

    if (!['r2', 'crm', 'both'].includes(config.dataSource)) {
      throw new AIServiceError('Invalid data source. Must be one of: r2, crm, both');
    }

    if (config.maxTokens && (config.maxTokens < 100 || config.maxTokens > 4000)) {
      throw new AIServiceError('maxTokens must be between 100 and 4000');
    }

    if (config.temperature && (config.temperature < 0 || config.temperature > 1)) {
      throw new AIServiceError('temperature must be between 0 and 1');
    }
  }

  protected async generateAnalysisPrompt(data: unknown, context: AgentContext): Promise<string> {
    const config = this.config as AnalysisConfig;
    const prompt = `Analyze the following data using ${config.analysisType} analysis:
      Data: ${JSON.stringify(data)}
      Context: ${JSON.stringify(context)}
      
      Provide:
      1. A concise summary
      2. Key insights
      3. Relevant metrics
      4. Identified patterns
      5. Actionable recommendations`;

    return prompt;
  }

  protected async processAnalysisResult(result: string): Promise<AnalysisResult> {
    try {
      // Parse the AI response into structured data
      const parsed = JSON.parse(result);
      
      return {
        summary: parsed.summary || '',
        insights: parsed.insights || [],
        metrics: parsed.metrics || {},
        patterns: parsed.patterns || [],
        recommendations: parsed.recommendations || [],
        metadata: {
          timestamp: new Date().toISOString(),
          dataPoints: parsed.metadata?.dataPoints || 0,
          confidence: parsed.metadata?.confidence || 0,
          processingTime: parsed.metadata?.processingTime || 0
        }
      };
    } catch (error) {
      throw new AIServiceError(`Failed to process analysis result: ${error}`);
    }
  }

  protected generateCacheKey(data: unknown, metadata: any): string {
    const keyData = {
      data,
      config: metadata.config,
    };
    return `analysis:${this.config.id}:${JSON.stringify(keyData)}`;
  }
} 