/**
 * HubSpot API Rate Limiter
 * 
 * Implements a token bucket algorithm to respect HubSpot's rate limits:
 * - 10 second rolling window: 100 requests max
 * - 1 second rolling window: 10 requests max
 * - Daily limit: 1,000,000 requests
 */

export interface RateLimiterOptions {
  maxRequestsPer10Seconds?: number;
  maxRequestsPerSecond?: number;
  debugMode?: boolean;
}

export class RateLimiter {
  private tokens10s: number;
  private tokens1s: number;
  private lastRefill10s: number;
  private lastRefill1s: number;
  private maxTokens10s: number;
  private maxTokens1s: number;
  private refillRate10s: number; // tokens per ms
  private refillRate1s: number; // tokens per ms
  private queue: (() => void)[] = [];
  private processing: boolean = false;
  private debugMode: boolean;

  constructor(options: RateLimiterOptions = {}) {
    // HubSpot private app limits: 100 requests per 10 seconds, but we'll be slightly conservative
    this.maxTokens10s = options.maxRequestsPer10Seconds || 95;
    // Secondary limit: 10 requests per second, but we'll be slightly conservative
    this.maxTokens1s = options.maxRequestsPerSecond || 9;
    
    this.tokens10s = this.maxTokens10s;
    this.tokens1s = this.maxTokens1s;
    this.lastRefill10s = Date.now();
    this.lastRefill1s = Date.now();
    
    // Refill rates (tokens per millisecond)
    this.refillRate10s = this.maxTokens10s / 10000; // 90 tokens per 10 seconds
    this.refillRate1s = this.maxTokens1s / 1000;   // 9 tokens per second
    
    this.debugMode = options.debugMode || false;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    
    // Refill 10s bucket
    const elapsed10s = now - this.lastRefill10s;
    const newTokens10s = elapsed10s * this.refillRate10s;
    this.tokens10s = Math.min(this.maxTokens10s, this.tokens10s + newTokens10s);
    this.lastRefill10s = now;
    
    // Refill 1s bucket
    const elapsed1s = now - this.lastRefill1s;
    const newTokens1s = elapsed1s * this.refillRate1s;
    this.tokens1s = Math.min(this.maxTokens1s, this.tokens1s + newTokens1s);
    this.lastRefill1s = now;
    
    if (this.debugMode) {
      console.log(`Tokens: ${this.tokens1s.toFixed(2)}|1s, ${this.tokens10s.toFixed(2)}|10s`);
    }
  }

  /**
   * Schedule a function to run when rate limits allow
   */
  public async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Add to queue
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  /**
   * Process queued functions respecting rate limits
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    this.refillTokens();
    
    // Check if we have tokens available
    if (this.tokens1s >= 1 && this.tokens10s >= 1) {
      // Consume tokens
      this.tokens1s -= 1;
      this.tokens10s -= 1;
      
      // Execute the next function in queue
      const nextFn = this.queue.shift();
      if (nextFn) {
        try {
          await nextFn();
        } catch (error) {
          console.error('Error executing rate-limited function:', error);
        }
      }
      
      // Continue processing queue
      setImmediate(() => this.processQueue());
    } else {
      // Calculate wait time based on the most restrictive limit
      const waitTime1s = this.tokens1s < 1 ? (1 - this.tokens1s) / this.refillRate1s : 0;
      const waitTime10s = this.tokens10s < 1 ? (1 - this.tokens10s) / this.refillRate10s : 0;
      const waitTime = Math.max(waitTime1s, waitTime10s);
      
      if (this.debugMode) {
        console.log(`Rate limited, waiting ${Math.ceil(waitTime)}ms`);
      }
      
      // Wait until enough tokens are available
      setTimeout(() => this.processQueue(), Math.ceil(waitTime) + 10); // Add 10ms buffer
    }
  }
  
  /**
   * Run multiple functions in parallel, respecting rate limits
   */
  public async scheduleAll<T>(fns: (() => Promise<T>)[]): Promise<T[]> {
    return Promise.all(fns.map(fn => this.schedule(fn)));
  }
  
  /**
   * Process an array with rate limiting, providing index to the processor function
   */
  public async processArray<T, R>(
    array: T[], 
    processor: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(array.length);
    const promises = array.map((item, index) => {
      return this.schedule(async () => {
        const result = await processor(item, index);
        results[index] = result;
        return result;
      });
    });
    
    await Promise.all(promises);
    return results;
  }
  
  /**
   * Reset the rate limiter state (useful for testing)
   */
  public reset(): void {
    this.tokens10s = this.maxTokens10s;
    this.tokens1s = this.maxTokens1s;
    this.lastRefill10s = Date.now();
    this.lastRefill1s = Date.now();
    this.queue = [];
    this.processing = false;
  }
}