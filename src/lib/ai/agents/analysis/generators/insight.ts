import { InsightGenerationConfig, AnalysisResult, InsightType } from '../types';
import { AIServiceError } from '../../../error';
import { BaseAgent, AgentConfig, AgentContext, AgentResult } from '../../base';
import { Message } from '../../../service';
import { AIService } from '../../../service';

export class InsightGenerator extends BaseAgent {
  private insightConfig: InsightGenerationConfig;

  constructor() {
    const config: AgentConfig = {
      id: 'insight-generator',
      name: 'Insight Generator',
      description: 'Agent for generating insights from analyzed data',
      model: 'gpt-4',
      aiService: new AIService(), // Will be overridden in initialize
    };
    super(config);
    this.insightConfig = {
      enabled: false,
      maxInsights: 10,
      minConfidence: 0.7,
      types: [],
    };
  }

  async initialize(config: AgentConfig & { insightConfig?: InsightGenerationConfig }): Promise<void> {
    await super.initialize(config);
    if (config.insightConfig) {
      this.insightConfig = config.insightConfig;
    }
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const data = context.metadata.data as unknown;
      const results = await this.generate(data, this.insightConfig);

      return {
        success: true,
        output: results,
        metadata: {
          ...context.metadata,
          insightGeneration: {
            status: 'completed',
            timestamp: new Date().toISOString(),
          },
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

  async generate(data: unknown, config: InsightGenerationConfig): Promise<Partial<AnalysisResult>> {
    try {
      if (!config.enabled) {
        return {
          insights: [],
          metrics: {},
          metadata: {
            insightGeneration: {
              status: 'disabled',
              timestamp: new Date().toISOString(),
            },
          },
        };
      }

      const results: AnalysisResult = {
        summary: '',
        insights: [],
        metrics: {},
        metadata: {
          insightGeneration: {
            status: 'completed',
            timestamp: new Date().toISOString(),
          },
        },
      };

      // Generate insights based on data and configuration
      const insights = await this.generateInsights(data, config);
      results.insights = insights;
      results.metrics.insights = insights.length;

      // Generate recommendations if enabled
      if (config.recommendations?.enabled) {
        const recommendations = await this.generateRecommendations(data, config.recommendations);
        results.insights.push(...recommendations);
        results.metrics.recommendations = recommendations.length;
      }

      return results;
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Failed to generate insights',
        'custom',
        'insight_generation_error'
      );
    }
  }

  private async generateInsights(
    data: unknown,
    config: InsightGenerationConfig
  ): Promise<Array<{
    type: InsightType;
    title: string;
    description: string;
    confidence: number;
    data: unknown;
    metadata?: Record<string, unknown>;
  }>> {
    const prompt = `Generate insights from the following data:

Data: ${JSON.stringify(data)}

Configuration:
- Max Insights: ${config.maxInsights}
- Min Confidence: ${config.minConfidence}
- Insight Types: ${config.types.join(', ')}

Format your response as JSON with the following structure:
{
  "insights": [
    {
      "type": "trend" | "anomaly" | "correlation" | "pattern" | "prediction" | "recommendation",
      "title": string,
      "description": string,
      "confidence": number,
      "data": unknown,
      "metadata": Record<string, unknown>
    }
  ]
}`;

    const message: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      createdAt: new Date(),
    };

    const response = await this.generateCompletion(
      [message],
      {
        temperature: 0.3,
      }
    );

    try {
      let content = '';
      const stream = response as unknown as AsyncIterable<string>;
      for await (const chunk of stream) {
        content += chunk;
      }
      const result = JSON.parse(content);
      return result.insights;
    } catch (error) {
      throw new AIServiceError(
        'Failed to parse insight generation result',
        'custom',
        'insight_parsing_error'
      );
    }
  }

  private async generateRecommendations(
    data: unknown,
    config: InsightGenerationConfig['recommendations']
  ): Promise<Array<{
    type: InsightType;
    title: string;
    description: string;
    confidence: number;
    data: unknown;
    recommendations: string[];
    metadata?: Record<string, unknown>;
  }>> {
    if (!config) {
      return [];
    }

    const prompt = `Generate recommendations based on the following data:

Data: ${JSON.stringify(data)}

Configuration:
- Max Recommendations: ${config.maxCount}
- Min Confidence: ${config.minConfidence}

Format your response as JSON with the following structure:
{
  "recommendations": [
    {
      "type": "recommendation",
      "title": string,
      "description": string,
      "confidence": number,
      "data": unknown,
      "recommendations": string[],
      "metadata": Record<string, unknown>
    }
  ]
}`;

    const message: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      createdAt: new Date(),
    };

    const response = await this.generateCompletion(
      [message],
      {
        temperature: 0.3,
      }
    );

    try {
      let content = '';
      const stream = response as unknown as AsyncIterable<string>;
      for await (const chunk of stream) {
        content += chunk;
      }
      const result = JSON.parse(content);
      return result.recommendations;
    } catch (error) {
      throw new AIServiceError(
        'Failed to parse recommendation generation result',
        'custom',
        'recommendation_parsing_error'
      );
    }
  }
} 