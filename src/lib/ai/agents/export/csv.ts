import { BaseExportAgent, ExportConfig, ExportMetadata } from './base';
import { AIServiceError } from '@/lib/ai/error';
import { AgentContext, AgentResult } from '@/lib/ai/agents/base';
import { Parser, Options } from 'json2csv';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

export class CSVExportAgent extends BaseExportAgent {
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const config = context.metadata.config as ExportConfig;
      await this.validateConfig(config);

      const cacheKey = this.generateCacheKey(context.metadata.data, context.metadata);
      
      // Check cache first
      const cachedResult = await this.redis.get(cacheKey);
      if (cachedResult) {
        return {
          success: true,
          output: cachedResult,
          metadata: {
            ...context.metadata,
            export: {
              status: 'completed',
              timestamp: new Date().toISOString(),
              format: 'csv',
              source: 'cache',
            } as ExportMetadata,
          },
        };
      }

      // Format data as CSV
      const formattedData = await this.formatData(context.metadata.data, config);
      
      // Generate CSV
      const parserOptions: Options<unknown> = {
        fields: config.fields,
        delimiter: ',',
        quote: '"',
      };
      
      const parser = new Parser(parserOptions);
      const csv = parser.parse(formattedData as unknown[]);
      
      // Compress if requested
      let finalData = csv;
      let size = csv.length;
      let isCompressed = false;
      
      if (config.options?.compression) {
        const compressed = await this.compress(csv);
        finalData = compressed;
        size = compressed.length;
        isCompressed = true;
      }

      const result = {
        success: true,
        output: finalData,
        metadata: {
          ...context.metadata,
          export: {
            status: 'completed',
            timestamp: new Date().toISOString(),
            format: 'csv',
            size,
            isCompressed,
          } as ExportMetadata,
        },
      };

      // Cache result
      await this.redis.set(cacheKey, result, { ex: this.cacheTTL });

      // Store result in database
      if (context.metadata.id) {
        await this.storeExportResult(context.metadata.id as string, {
          format: 'csv',
          data: finalData,
          metadata: result.metadata.export as ExportMetadata,
        });
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('CSV export error:', err);
      return {
        success: false,
        output: null,
        error: err,
        metadata: context.metadata,
      };
    }
  }

  protected async formatData(data: unknown, config: ExportConfig): Promise<unknown[]> {
    if (!Array.isArray(data)) {
      throw new AIServiceError('Data must be an array for CSV export');
    }

    // Filter data if filters are provided
    if (config.filters) {
      return data.filter(item => {
        const record = item as Record<string, unknown>;
        return Object.entries(config.filters!).every(([key, value]) => 
          record[key] === value
        );
      });
    }

    return data;
  }

  protected async validateConfig(config: ExportConfig): Promise<void> {
    if (!config.format || config.format !== 'csv') {
      throw new AIServiceError('Invalid export format. Expected "csv"');
    }

    if (config.fields && !Array.isArray(config.fields)) {
      throw new AIServiceError('Fields must be an array');
    }
  }

  private async compress(data: string): Promise<string> {
    try {
      const buffer = Buffer.from(data, 'utf-8');
      const compressed = await gzipAsync(buffer);
      return compressed.toString('base64');
    } catch (error) {
      console.error('Compression failed:', error);
      return data; // Fallback to uncompressed data
    }
  }
} 