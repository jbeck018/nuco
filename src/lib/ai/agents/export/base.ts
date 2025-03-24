import { BaseAgent, AgentConfig, AgentContext, AgentResult } from '../base';
import { AIServiceError } from '../../error';
import { Redis } from '@upstash/redis';
import { db } from '@/lib/db';
import { exportResults } from '@/lib/db/schema';

export interface ExportConfig {
  format: 'csv' | 'pdf' | 'json';
  fields?: string[];
  filters?: Record<string, unknown>;
  options?: {
    includeMetadata?: boolean;
    compression?: boolean;
    styling?: Record<string, unknown>;
  };
}

export interface ExportMetadata {
  status: 'completed' | 'failed' | 'processing';
  timestamp: string;
  format: string;
  size?: number;
  url?: string;
  error?: string;
}

export abstract class BaseExportAgent extends BaseAgent {
  protected redis!: Redis;
  protected cacheTTL: number = 3600; // 1 hour default

  async initialize(config: AgentConfig): Promise<void> {
    await super.initialize(config);
    
    // Initialize Redis connection
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL || '',
      token: process.env.UPSTASH_REDIS_TOKEN || '',
    });
  }

  protected async storeExportResult(
    analysisId: string,
    result: {
      format: string;
      data: unknown;
      metadata: ExportMetadata;
    }
  ): Promise<void> {
    try {
      await db.insert(exportResults).values({
        analysisId,
        format: result.format,
        data: result.data,
        metadata: result.metadata,
      });
    } catch (error) {
      console.error('Failed to store export result:', error);
      // Don't throw here, as this is a non-critical operation
    }
  }

  protected generateCacheKey(data: unknown, metadata: Record<string, unknown>): string {
    const dataHash = JSON.stringify(data);
    const metadataHash = JSON.stringify(metadata);
    return `export:${dataHash}:${metadataHash}`;
  }

  protected validateConfig(config: AgentConfig & ExportConfig): void {
    super.validateConfig(config);
    if (!config.format) {
      throw new Error('Export format is required');
    }
  }

  protected abstract formatData(data: unknown, config: ExportConfig): Promise<unknown>;
} 