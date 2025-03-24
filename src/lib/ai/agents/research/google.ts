import { z } from 'zod';
import { BaseAgent, AgentConfig, AgentContext, AgentResult } from '../base';
import { AIServiceError } from '@/lib/ai/error';
import { Redis } from '@upstash/redis';
import { db } from '@/lib/db';
import { webResearchResults } from '@/lib/db/schema';
import { GoogleSearchAPIClient } from './api/google';
import { ContentFetcher } from './content/fetcher';
import { ResultAnalyzer, AnalysisResult } from './analysis/result-analyzer';
import { ProcessedContent } from './content/processor';
import { AIService } from '@/lib/ai/service';

// Schema for validating research results
const researchResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
  metadata: z.object({
    publishedDate: z.string().optional(),
    author: z.string().optional(),
    source: z.string().optional(),
  }).optional(),
});

export interface GoogleSearchConfig extends Omit<AgentConfig, 'aiService'> {
  query: string;
  maxResults?: number;
  processContent?: boolean;
  redis: Redis;
  timeout?: number;
  includeImages?: boolean;
  includeVideos?: boolean;
  language?: string;
  region?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  model: string;
  aiService: AIService;
}

export interface ResearchResult {
  query: string;
  url: string;
  title: string;
  description: string;
  content?: ProcessedContent;
  analysis?: AnalysisResult;
  metadata: {
    position: number;
    timestamp: string;
  };
}

export class GoogleSearchAgent extends BaseAgent {
  private readonly apiClient: GoogleSearchAPIClient;
  private readonly contentFetcher: ContentFetcher;
  private readonly resultAnalyzer: ResultAnalyzer;
  private readonly redis: Redis;
  private readonly cacheTTL: number = 3600; // 1 hour

  static readonly defaultConfig: GoogleSearchConfig = {
    id: 'google-search',
    name: 'Google Search Agent',
    description: 'Performs web searches using Google via SerpApi',
    maxResults: 10,
    timeout: 30000,
    includeImages: false,
    includeVideos: false,
    language: 'en',
    region: 'us',
    processContent: false,
    query: '', // Will be set by user
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    }),
    model: 'gpt-4', // Default model
    aiService: new AIService() // Will be overridden by user config
  };

  constructor(config: Partial<GoogleSearchConfig> = {}) {
    const fullConfig = { ...GoogleSearchAgent.defaultConfig, ...config };
    super(fullConfig);
    this.apiClient = new GoogleSearchAPIClient();
    this.contentFetcher = new ContentFetcher();
    this.resultAnalyzer = new ResultAnalyzer(this.config.model, this.config.aiService);
    this.redis = fullConfig.redis;
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const config = { ...this.config, ...(context.metadata.config || {}) } as GoogleSearchConfig;
      await this.validateConfig(config);

      const cacheKey = this.generateCacheKey(context.metadata.data, context.metadata);
      
      // Check cache first
      const cachedResult = await this.redis.get(cacheKey);
      if (cachedResult) {
        return {
          success: true,
          output: JSON.parse(cachedResult as string),
          metadata: {
            ...context.metadata,
            research: {
              status: 'completed',
              timestamp: new Date().toISOString(),
              source: 'google',
              sourceType: 'cache',
            },
          },
        };
      }

      // Perform search
      const results = await this.performSearch(context.metadata.data as string, config);
      
      // Process results
      const processedResults = await this.processResults(results, config);

      const result = {
        success: true,
        output: processedResults,
        metadata: {
          ...context.metadata,
          research: {
            status: 'completed',
            timestamp: new Date().toISOString(),
            source: 'google',
            resultCount: processedResults.length,
          },
        },
      };

      // Cache result
      await this.redis.set(cacheKey, JSON.stringify(result), { ex: this.cacheTTL });

      // Store result in database
      if (context.metadata.id) {
        await this.storeResearchResult(context.metadata.id as string, {
          query: context.metadata.data as string,
          results: processedResults,
          metadata: result.metadata.research,
        });
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Google search error:', err);
      return {
        success: false,
        output: null,
        error: err,
        metadata: context.metadata,
      };
    }
  }

  protected async validateConfig(config: GoogleSearchConfig): Promise<void> {
    if (!config.id || config.id !== 'google-search') {
      throw new AIServiceError('Invalid agent ID. Expected "google-search"');
    }

    if (!config.name || !config.description) {
      throw new AIServiceError('Missing required configuration: name and description');
    }

    if (config.maxResults && (config.maxResults < 1 || config.maxResults > 100)) {
      throw new AIServiceError('maxResults must be between 1 and 100');
    }

    if (config.timeout && (config.timeout < 1000 || config.timeout > 60000)) {
      throw new AIServiceError('timeout must be between 1000 and 60000 milliseconds');
    }
  }

  private async performSearch(query: string, config: GoogleSearchConfig): Promise<ResearchResult[]> {
    return this.apiClient.search(query, {
      maxResults: config.maxResults,
      language: config.language,
      region: config.region,
      dateRange: config.dateRange,
    });
  }

  private async processResults(results: ResearchResult[], config: GoogleSearchConfig): Promise<ResearchResult[]> {
    const processedResults: ResearchResult[] = [];

    for (const result of results) {
      try {
        // Fetch and process content if enabled
        let content: ProcessedContent | undefined;
        if (config.processContent) {
          content = await this.contentFetcher.fetchContent(result.url);
        }

        // Analyze result if content is available
        let analysis: AnalysisResult | undefined;
        if (content) {
          analysis = await this.resultAnalyzer.analyzeResult(result, content);
        }

        processedResults.push({
          query: config.query,
          url: result.url,
          title: result.title,
          description: result.description,
          content,
          analysis,
          metadata: {
            position: result.metadata.position,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error(`Failed to process result: ${error}`);
        // Continue with next result
        continue;
      }
    }

    return processedResults;
  }

  private async storeResearchResult(id: string, data: { query: string; results: ResearchResult[]; metadata: any }): Promise<void> {
    await db.insert(webResearchResults).values({
      id,
      query: data.query,
      results: data.results,
      metadata: data.metadata,
    });
  }

  private generateCacheKey(data: unknown, metadata: any): string {
    const keyData = {
      query: data,
      config: metadata.config,
    };
    return `research:google:${JSON.stringify(keyData)}`;
  }
} 