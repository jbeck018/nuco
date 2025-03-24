import { AIServiceError } from '../error';
import { AgentState } from './base';
import { db } from '@/lib/db';
import { agentExecutions } from '@/lib/db/schema/agents';
import { eq } from 'drizzle-orm';

export interface RecoveryConfig {
  maxRetries: number;
  backoffFactor: number;
  maxBackoffMs: number;
  retryableErrors: string[];
  circuitBreaker: {
    threshold: number;
    resetTimeout: number;
  };
  fallbackStrategies: {
    [key: string]: (error: Error, context: any) => Promise<any>;
  };
}

export interface RecoveryContext {
  agentId: string;
  executionId: string;
  attempt: number;
  lastError?: Error;
  state?: AgentState;
}

export class RecoveryManager {
  private config: RecoveryConfig;
  private failureCounts: Map<string, number>;
  private circuitBreakerStates: Map<string, boolean>;
  private lastFailureTimes: Map<string, number>;

  constructor(config: Partial<RecoveryConfig> = {}) {
    this.config = {
      maxRetries: 3,
      backoffFactor: 2,
      maxBackoffMs: 30000,
      retryableErrors: [
        'rate_limit',
        'timeout',
        'network_error',
        'server_error'
      ],
      circuitBreaker: {
        threshold: 5,
        resetTimeout: 60000 // 1 minute
      },
      fallbackStrategies: {},
      ...config
    };
    this.failureCounts = new Map();
    this.circuitBreakerStates = new Map();
    this.lastFailureTimes = new Map();
  }

  /**
   * Attempt to recover from an error
   */
  async recover(error: Error, context: RecoveryContext): Promise<any> {
    const { agentId, executionId, attempt } = context;

    // Check if circuit breaker is open
    if (this.isCircuitBreakerOpen(agentId)) {
      throw new AIServiceError(
        'Circuit breaker is open. Too many recent failures.',
        'recovery',
        'circuit_breaker_open'
      );
    }

    // Check if error is retryable
    if (!this.isRetryableError(error)) {
      await this.handleNonRetryableError(error, context);
      return null;
    }

    // Check if we've exceeded max retries
    if (attempt >= this.config.maxRetries) {
      await this.handleMaxRetriesExceeded(error, context);
      return null;
    }

    // Calculate backoff time
    const backoffMs = this.calculateBackoff(attempt);

    // Update failure count
    this.incrementFailureCount(agentId);

    // Log retry attempt
    await this.logRetryAttempt(error, context, backoffMs);

    // Wait for backoff period
    await new Promise(resolve => setTimeout(resolve, backoffMs));

    // Try fallback strategy if available
    const fallbackStrategy = this.config.fallbackStrategies[error.name];
    if (fallbackStrategy) {
      try {
        return await fallbackStrategy(error, context);
      } catch (fallbackError) {
        console.error('Fallback strategy failed:', fallbackError);
      }
    }

    return null;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    if (error instanceof AIServiceError) {
      return this.config.retryableErrors.includes(error.code);
    }
    return false;
  }

  /**
   * Calculate exponential backoff time
   */
  private calculateBackoff(attempt: number): number {
    const backoff = Math.min(
      Math.pow(this.config.backoffFactor, attempt) * 1000,
      this.config.maxBackoffMs
    );
    // Add jitter to prevent thundering herd
    return backoff * (0.75 + Math.random() * 0.5);
  }

  /**
   * Handle non-retryable errors
   */
  private async handleNonRetryableError(error: Error, context: RecoveryContext): Promise<void> {
    const { agentId, executionId } = context;

    // Update execution record
    await db
      .update(agentExecutions)
      .set({
        status: 'failed',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          nonRetryable: true,
          errorType: error.name,
          errorCode: error instanceof AIServiceError ? error.code : 'unknown'
        }
      })
      .where(eq(agentExecutions.id, executionId));

    // Reset failure count for non-retryable errors
    this.failureCounts.delete(agentId);
  }

  /**
   * Handle max retries exceeded
   */
  private async handleMaxRetriesExceeded(error: Error, context: RecoveryContext): Promise<void> {
    const { agentId, executionId } = context;

    // Update execution record
    await db
      .update(agentExecutions)
      .set({
        status: 'failed',
        completedAt: new Date(),
        error: `Max retries (${this.config.maxRetries}) exceeded: ${error.message}`,
        metadata: {
          maxRetriesExceeded: true,
          totalAttempts: context.attempt,
          errorType: error.name,
          errorCode: error instanceof AIServiceError ? error.code : 'unknown'
        }
      })
      .where(eq(agentExecutions.id, executionId));

    // Reset failure count
    this.failureCounts.delete(agentId);
  }

  /**
   * Log retry attempt
   */
  private async logRetryAttempt(error: Error, context: RecoveryContext, backoffMs: number): Promise<void> {
    const { agentId, executionId, attempt } = context;

    await db
      .update(agentExecutions)
      .set({
        metadata: {
          retryAttempt: attempt + 1,
          backoffMs,
          errorType: error.name,
          errorCode: error instanceof AIServiceError ? error.code : 'unknown'
        }
      })
      .where(eq(agentExecutions.id, executionId));
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(agentId: string): boolean {
    const isOpen = this.circuitBreakerStates.get(agentId);
    if (isOpen) {
      const lastFailureTime = this.lastFailureTimes.get(agentId) || 0;
      const now = Date.now();
      if (now - lastFailureTime > this.config.circuitBreaker.resetTimeout) {
        // Reset circuit breaker
        this.circuitBreakerStates.set(agentId, false);
        this.failureCounts.set(agentId, 0);
        return false;
      }
    }
    return isOpen || false;
  }

  /**
   * Increment failure count and check circuit breaker
   */
  private incrementFailureCount(agentId: string): void {
    const currentCount = (this.failureCounts.get(agentId) || 0) + 1;
    this.failureCounts.set(agentId, currentCount);

    if (currentCount >= this.config.circuitBreaker.threshold) {
      this.circuitBreakerStates.set(agentId, true);
      this.lastFailureTimes.set(agentId, Date.now());
    }
  }

  /**
   * Add a fallback strategy
   */
  addFallbackStrategy(errorType: string, strategy: (error: Error, context: RecoveryContext) => Promise<any>): void {
    this.config.fallbackStrategies[errorType] = strategy;
  }

  /**
   * Reset circuit breaker for an agent
   */
  resetCircuitBreaker(agentId: string): void {
    this.circuitBreakerStates.delete(agentId);
    this.failureCounts.delete(agentId);
    this.lastFailureTimes.delete(agentId);
  }
} 