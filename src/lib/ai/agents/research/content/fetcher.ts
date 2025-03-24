import { Redis } from '@upstash/redis';
import { AIServiceError } from '@/lib/ai/error';
import { ProcessedContent } from './processor';
import { ContentProcessor } from './processor';

export class ContentFetcher {
  private readonly redis: Redis;
  private readonly cacheTTL = 3600; // 1 hour cache
  private readonly maxRetries = 3;
  private readonly timeout = 30000; // 30 seconds

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    });
  }

  async fetchContent(url: string): Promise<ProcessedContent> {
    try {
      // Check cache first
      const cachedContent = await this.getFromCache(url);
      if (cachedContent) {
        return cachedContent;
      }

      // Fetch and process content
      const html = await this.fetchHTML(url);
      const processor = new ContentProcessor(html);
      const content = await processor.process();

      // Cache the result
      await this.cacheContent(url, content);

      return content;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new AIServiceError(`Failed to fetch content from ${url}: ${err.message}`);
    }
  }

  private async fetchHTML(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NeucoBot/1.0; +http://neuco.ai)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.text();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt === this.maxRetries) {
          break;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError || new Error('Failed to fetch HTML after multiple attempts');
  }

  private async getFromCache(url: string): Promise<ProcessedContent | null> {
    try {
      const cached = await this.redis.get(`content:${url}`);
      return cached ? JSON.parse(cached as string) : null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  private async cacheContent(url: string, content: ProcessedContent): Promise<void> {
    try {
      await this.redis.set(`content:${url}`, JSON.stringify(content), { ex: this.cacheTTL });
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }
} 