import { BaseAgent, AgentConfig, AgentContext, AgentResult } from '@/lib/ai/agents/base';
import { AIServiceError } from '@/lib/ai/error';
import { Redis } from '@upstash/redis';
import { db } from '@/lib/db';
import { webResearchResults } from '@/lib/db/schema';
import { z } from 'zod';
import { AIService } from '@/lib/ai/service';

interface WebResearchConfig extends Omit<AgentConfig, 'aiService'> {
  maxResults?: number;
  timeout?: number;
  includeImages?: boolean;
  includeVideos?: boolean;
  language?: string;
  region?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  aiService: AIService;
}

interface ResearchResult {
  url: string;
  title: string;
  snippet: string;
  source: string;
  publishedDate?: Date;
  relevance: number;
  metadata: Record<string, unknown>;
}

const researchResultSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  snippet: z.string(),
  source: z.string(),
  publishedDate: z.date().optional(),
  relevance: z.number().min(0).max(1),
  metadata: z.record(z.unknown()),
});

export class WebResearchAgent extends BaseAgent {
  private redis: Redis;
  private cacheTTL = 3600; // 1 hour

  constructor() {
    const config: AgentConfig = {
      id: 'web-research',
      name: 'Web Research Agent',
      description: 'Agent for conducting web research',
      model: 'gpt-4',
      aiService: new AIService(), // Will be overridden in initialize
    };
    super(config);
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const config = context.metadata.config as WebResearchConfig;
      await this.validateConfig(config);

      const query = context.metadata.query as string;
      if (!query) {
        throw new AIServiceError('Research query is required');
      }

      const cacheKey = this.generateCacheKey(query, config);
      
      // Check cache first
      const cachedResult = await this.redis.get(cacheKey);
      if (cachedResult) {
        return {
          success: true,
          output: cachedResult,
          metadata: {
            ...context.metadata,
            research: {
              status: 'completed',
              timestamp: new Date().toISOString(),
              source: 'cache',
            },
          },
        };
      }

      // Perform web research
      const results = await this.performResearch(query, config);
      
      // Validate and process results
      const processedResults = await this.processResults(results, config);

      const result = {
        success: true,
        output: processedResults,
        metadata: {
          ...context.metadata,
          research: {
            status: 'completed',
            timestamp: new Date().toISOString(),
            query,
            resultCount: processedResults.length,
          },
        },
      };

      // Cache result
      await this.redis.set(cacheKey, result, { ex: this.cacheTTL });

      // Store result in database
      if (context.metadata.id) {
        await this.storeResearchResult(context.metadata.id as string, {
          query,
          results: processedResults,
          metadata: result.metadata.research,
        });
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Web research error:', err);
      return {
        success: false,
        output: null,
        error: err,
        metadata: context.metadata,
      };
    }
  }

  protected async validateConfig(config: WebResearchConfig): Promise<void> {
    if (!config.id) {
      throw new AIServiceError('Agent ID is required');
    }
    if (!config.name) {
      throw new AIServiceError('Agent name is required');
    }
    if (!config.description) {
      throw new AIServiceError('Agent description is required');
    }
  }

  private async performResearch(query: string, config: WebResearchConfig): Promise<ResearchResult[]> {
    // TODO: Implement actual web research logic using search APIs
    // This is a placeholder that should be replaced with real implementation
    return [];
  }

  private async processResults(results: ResearchResult[], config: WebResearchConfig): Promise<ResearchResult[]> {
    // Validate results against schema
    const validatedResults = results.map(result => {
      try {
        return researchResultSchema.parse(result);
      } catch (error) {
        console.error('Invalid research result:', error);
        return null;
      }
    }).filter((result): result is ResearchResult => result !== null);

    // Sort by relevance
    return validatedResults.sort((a, b) => b.relevance - a.relevance);
  }

  private async storeResearchResult(id: string, data: {
    query: string;
    results: ResearchResult[];
    metadata: Record<string, unknown>;
  }): Promise<void> {
    await db.insert(webResearchResults).values({
      id,
      query: data.query,
      results: data.results,
      metadata: data.metadata,
      createdAt: new Date(),
    });
  }

  private generateCacheKey(query: string, config: WebResearchConfig): string {
    return `web-research:${config.id}:${query}:${JSON.stringify(config)}`;
  }
} 