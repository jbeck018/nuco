import { GoogleSearchAPIConfig, defaultGoogleSearchConfig } from '../config/google';
import { AIServiceError } from '@/lib/ai/error';
import { ResearchResult } from '../google';

interface SerpApiResponse {
  organic_results?: Array<{
    title: string;
    link: string;
    snippet: string;
    date?: string;
    source?: string;
    author?: string;
    position?: number;
  }>;
  error?: string;
}

export class GoogleSearchAPIClient {
  private config: GoogleSearchAPIConfig;

  constructor(config: Partial<GoogleSearchAPIConfig> = {}) {
    this.config = { ...defaultGoogleSearchConfig, ...config };
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new AIServiceError('SerpApi key is required. Please set SERPAPI_KEY environment variable.');
    }
  }

  async search(query: string, options: {
    maxResults?: number;
    language?: string;
    region?: string;
    dateRange?: { start: string; end: string };
  } = {}): Promise<ResearchResult[]> {
    const { maxResults = 10, language = 'en', region = 'US', dateRange } = options;
    const num = Math.min(maxResults, 100); // SerpApi max is 100 per request

    try {
      const response = await fetch(this.buildSearchUrl(query, num, language, region), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new AIServiceError(`SerpApi error: ${response.statusText}`);
      }

      const data = await response.json() as SerpApiResponse;

      if (data.error) {
        throw new AIServiceError(`SerpApi error: ${data.error}`);
      }

      if (!data.organic_results) {
        return [];
      }

      return this.processSearchResults(data.organic_results, query, dateRange);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new AIServiceError(`Failed to perform Google search: ${err.message}`);
    }
  }

  private buildSearchUrl(query: string, num: number, language: string, region: string): string {
    const params = new URLSearchParams({
      api_key: this.config.apiKey,
      q: query,
      num: num.toString(),
      hl: language,
      gl: region.toLowerCase(),
      engine: 'google',
    });

    return `${this.config.baseUrl}?${params.toString()}`;
  }

  private processSearchResults(items: SerpApiResponse['organic_results'], query: string, dateRange?: { start: string; end: string }): ResearchResult[] {
    if (!items) return [];
    
    return items.map(item => {
      const metadata = {
        position: item.position || 0,
        timestamp: new Date().toISOString()
      };

      return {
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        query: query,
        description: item.snippet,
        metadata
      };
    });
  }
} 