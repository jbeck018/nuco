import { AIServiceError } from '../../error';

/**
 * API configuration interface
 */
export interface ApiConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  rateLimit?: {
    requestsPerMinute: number;
    burstSize?: number;
  };
}

/**
 * API data source implementation
 */
export class ApiDataSource {
  private config: ApiConfig;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private windowStart: number = Date.now();

  constructor(config: ApiConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Execute the API request
   */
  async execute(): Promise<Record<string, unknown>> {
    try {
      // Apply rate limiting
      await this.applyRateLimit();

      // Make the request with retries
      const response = await this.makeRequestWithRetry();

      // Parse and validate response
      const data = await this.parseResponse(response);

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      };
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Failed to execute API request',
        'custom',
        'api_request_error'
      );
    }
  }

  /**
   * Make the API request with retries
   */
  private async makeRequestWithRetry(): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.retries!; attempt++) {
      try {
        const response = await fetch(this.config.url, {
          method: this.config.method,
          headers: this.config.headers,
          body: this.config.body ? JSON.stringify(this.config.body) : undefined,
          signal: AbortSignal.timeout(this.config.timeout!),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.config.retries!) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay! * Math.pow(2, attempt)));
          continue;
        }
      }
    }

    throw lastError;
  }

  /**
   * Parse and validate the response
   */
  private async parseResponse(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return response.json();
    } else if (contentType?.includes('text/')) {
      return response.text();
    } else {
      return response.blob();
    }
  }

  /**
   * Apply rate limiting
   */
  private async applyRateLimit(): Promise<void> {
    if (!this.config.rateLimit) {
      return;
    }

    const now = Date.now();
    const windowSize = 60000; // 1 minute in milliseconds
    const { requestsPerMinute, burstSize = requestsPerMinute } = this.config.rateLimit;

    // Reset window if needed
    if (now - this.windowStart >= windowSize) {
      this.windowStart = now;
      this.requestCount = 0;
    }

    // Check if we've exceeded the rate limit
    if (this.requestCount >= burstSize) {
      const timeToWait = this.windowStart + windowSize - now;
      if (timeToWait > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToWait));
      }
      this.windowStart = Date.now();
      this.requestCount = 0;
    }

    // Ensure minimum delay between requests
    const minDelay = windowSize / requestsPerMinute;
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
} 