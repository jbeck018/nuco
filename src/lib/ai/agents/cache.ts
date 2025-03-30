import { z } from 'zod';
import { AIServiceError } from '../error';

// Cache entry schema for runtime validation
const cacheEntrySchema = z.object({
  key: z.string(),
  value: z.unknown(),
  timestamp: z.number(),
  ttl: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

type CacheEntry = z.infer<typeof cacheEntrySchema>;

export interface CacheConfig {
  enabled: boolean;
  defaultTTL: number;  // Default time-to-live in seconds
  maxSize: number;     // Maximum number of entries
  maxMemory: number;   // Maximum memory usage in MB
  compression: boolean;
}

export class CacheManager {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;
  private currentMemory: number;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enabled: true,
      defaultTTL: 3600,  // 1 hour default
      maxSize: 1000,     // 1000 entries max
      maxMemory: 64,     // 64MB max
      compression: true,
      ...config
    };
    this.cache = new Map();
    this.currentMemory = 0;
  }

  async set(key: string, value: unknown, ttl?: number, metadata?: Record<string, unknown>): Promise<void> {
    if (!this.config.enabled) return;

    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      metadata
    };

    // Validate entry
    cacheEntrySchema.parse(entry);

    // Check memory limits
    const entrySize = this.estimateEntrySize(entry);
    if (entrySize > this.config.maxMemory * 1024 * 1024) {
      throw new AIServiceError('Cache entry exceeds maximum memory limit');
    }

    // Evict if needed
    while (this.currentMemory + entrySize > this.config.maxMemory * 1024 * 1024 || 
           this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    // Store entry
    this.cache.set(key, entry);
    this.currentMemory += entrySize;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.currentMemory -= this.estimateEntrySize(entry);
      return null;
    }

    return entry.value as T;
  }

  async delete(key: string): Promise<void> {
    if (!this.config.enabled) return;

    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.currentMemory -= this.estimateEntrySize(entry);
    }
  }

  async clear(): Promise<void> {
    if (!this.config.enabled) return;
    this.cache.clear();
    this.currentMemory = 0;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > (entry.ttl ?? 3600) * 1000;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.cache.delete(oldestKey);
      this.currentMemory -= this.estimateEntrySize(entry);
    }
  }

  private estimateEntrySize(entry: CacheEntry): number {
    // Rough estimation based on stringified size
    const stringified = JSON.stringify(entry);
    return this.config.compression ? 
      Math.ceil(stringified.length * 0.5) : // Assume 50% compression
      stringified.length;
  }

  getStats(): { size: number; memory: number } {
    return {
      size: this.cache.size,
      memory: this.currentMemory
    };
  }
} 