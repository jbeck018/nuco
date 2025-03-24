import { BaseAgent, AgentConfig, AgentContext, AgentResult } from '../base';
import { AIServiceError } from '../../error';
import { TimelinessConfig, TimelinessResult, timelinessResultSchema } from './types';
import { Redis } from '@upstash/redis';
import { db } from '@/lib/db';
import { agentExecutions } from '@/lib/db/schema/agents';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { AIService } from '../../service';

export class TimelinessAuditor extends BaseAgent {
  private timelinessConfig: TimelinessConfig = {
    enabled: false,
    rules: [],
    thresholds: {
      updateFrequency: 0.95,
      dataAge: 0.9,
      syncStatus: 0.98,
    },
  };
  private redis: Redis;
  private readonly cacheTTL = 3600; // 1 hour

  constructor() {
    const config: AgentConfig = {
      enabled: false,
      name: 'timeliness-auditor',
      description: 'Audits data timeliness and freshness',
      id: 'timeliness-auditor',
      model: 'gpt-4',
      aiService: new AIService(), // Will be overridden in initialize
    };
    super(config);
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  async initialize(config: AgentConfig & { timelinessConfig: TimelinessConfig }): Promise<void> {
    await super.initialize(config);
    this.timelinessConfig = config.timelinessConfig;
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const executionId = crypto.randomUUID();

    try {
      // Create execution record
      await db.insert(agentExecutions).values({
        id: executionId,
        agentId: this.config.id,
        status: 'running',
        startedAt: new Date(),
      });

      const result = await this.audit(context.data);

      // Update execution record
      await db
        .update(agentExecutions)
        .set({
          status: 'completed',
          completedAt: new Date(),
          output: result,
        })
        .where(eq(agentExecutions.id, executionId));

      return {
        success: true,
        output: result,
        metadata: {
          executionId,
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      // Update execution record with error
      await db
        .update(agentExecutions)
        .set({
          status: 'failed',
          completedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(agentExecutions.id, executionId));

      throw new AIServiceError('Timeliness audit failed');
    }
  }

  private async audit(data: unknown): Promise<TimelinessResult> {
    const startTime = Date.now();
    const issues: TimelinessResult['issues'] = [];
    const recommendations: TimelinessResult['recommendations'] = [];
    const metrics = {
      totalRules: 0,
      passedRules: 0,
      failedRules: 0,
      byType: {
        updateFrequency: { total: 0, passed: 0, failed: 0, averageFrequency: 0 },
        dataAge: { total: 0, passed: 0, failed: 0, averageAge: 0 },
        syncStatus: { total: 0, passed: 0, failed: 0, syncRate: 0 },
      },
    };

    // Process each rule
    for (const rule of this.timelinessConfig.rules) {
      metrics.totalRules++;
      const metricType = this.getMetricType(rule.type);
      metrics.byType[metricType].total++;

      const value = this.getFieldValue(data, rule.field);
      const lastUpdate = await this.getLastUpdate(rule.field);

      if (this.isRuleValid(value, lastUpdate, rule)) {
        metrics.passedRules++;
        metrics.byType[metricType].passed++;
      } else {
        metrics.failedRules++;
        metrics.byType[metricType].failed++;

        const issue = this.createIssue(rule, value, lastUpdate);
        issues.push(issue);

        const recommendation = this.createRecommendation(rule);
        recommendations.push(recommendation);
      }
    }

    // Calculate metrics
    this.calculateMetrics(metrics);

    // Calculate overall score
    const score = this.calculateScore(metrics);

    // Determine status
    const status = this.determineStatus(score, metrics);

    const result: TimelinessResult = {
      status,
      score,
      metrics,
      issues,
      recommendations,
      metadata: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        version: '1.0.0',
      },
    };

    // Validate result
    return timelinessResultSchema.parse(result) as TimelinessResult;
  }

  private getMetricType(ruleType: TimelinessConfig['rules'][number]['type']): keyof TimelinessResult['metrics']['byType'] {
    const typeMap: Record<typeof ruleType, keyof TimelinessResult['metrics']['byType']> = {
      'update-frequency': 'updateFrequency',
      'data-age': 'dataAge',
      'sync-status': 'syncStatus',
    };
    return typeMap[ruleType];
  }

  private getFieldValue(data: unknown, field: string): unknown {
    if (typeof data !== 'object' || data === null) return undefined;
    return (data as Record<string, unknown>)[field];
  }

  private async getLastUpdate(field: string): Promise<Date> {
    const cacheKey = `last_update:${field}`;
    const cached = await this.redis.get<number>(cacheKey);
    
    if (cached) {
      return new Date(cached);
    }

    // In a real implementation, this would query your database or tracking system
    // For now, we'll return a default value
    const defaultDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    await this.redis.set(cacheKey, defaultDate.getTime(), { ex: this.cacheTTL });
    return defaultDate;
  }

  private isRuleValid(value: unknown, lastUpdate: Date, rule: TimelinessConfig['rules'][number]): boolean {
    if (value === undefined) return false;

    const { type, constraints } = rule;
    const now = Date.now();
    const age = now - lastUpdate.getTime();

    switch (type) {
      case 'update-frequency':
        if (!constraints?.minUpdateFrequency && !constraints?.maxUpdateFrequency) return true;
        if (constraints.minUpdateFrequency && age < constraints.minUpdateFrequency) return false;
        if (constraints.maxUpdateFrequency && age > constraints.maxUpdateFrequency) return false;
        return true;

      case 'data-age':
        if (!constraints?.maxAge) return true;
        return age <= constraints.maxAge;

      case 'sync-status':
        if (!constraints?.syncThreshold) return true;
        return age <= constraints.syncThreshold;

      default:
        return true;
    }
  }

  private createIssue(
    rule: TimelinessConfig['rules'][number],
    value: unknown,
    lastUpdate: Date
  ): TimelinessResult['issues'][0] {
    const { field, type, constraints } = rule;
    let expected = '';
    const actual = `Last updated ${this.formatDuration(Date.now() - lastUpdate.getTime())} ago`;
    const severity: 'low' | 'medium' | 'high' = type === 'sync-status' ? 'high' : 'medium';

    switch (type) {
      case 'update-frequency':
        expected = constraints?.minUpdateFrequency && constraints?.maxUpdateFrequency
          ? `Should update every ${this.formatDuration(constraints.minUpdateFrequency)} to ${this.formatDuration(constraints.maxUpdateFrequency)}`
          : constraints?.minUpdateFrequency
          ? `Should update at least every ${this.formatDuration(constraints.minUpdateFrequency)}`
          : constraints?.maxUpdateFrequency
          ? `Should update at most every ${this.formatDuration(constraints.maxUpdateFrequency)}`
          : 'Should be updated regularly';
        break;

      case 'data-age':
        expected = constraints?.maxAge
          ? `Should be no older than ${this.formatDuration(constraints.maxAge)}`
          : 'Should be fresh';
        break;

      case 'sync-status':
        expected = constraints?.syncThreshold
          ? `Should sync within ${this.formatDuration(constraints.syncThreshold)}`
          : 'Should be in sync';
        break;
    }

    return {
      field,
      type,
      value,
      lastUpdate,
      expected,
      actual,
      severity,
    };
  }

  private createRecommendation(rule: TimelinessConfig['rules'][number]): TimelinessResult['recommendations'][0] {
    const { field, type } = rule;
    let message = '';
    let priority: 'low' | 'medium' | 'high' = 'medium';

    switch (type) {
      case 'update-frequency':
        message = `Ensure ${field} is updated within the specified frequency`;
        priority = 'medium';
        break;

      case 'data-age':
        message = `Ensure ${field} is refreshed to maintain freshness`;
        priority = 'high';
        break;

      case 'sync-status':
        message = `Ensure ${field} is properly synchronized`;
        priority = 'high';
        break;
    }

    return {
      field,
      type,
      message,
      priority,
    };
  }

  private calculateMetrics(metrics: TimelinessResult['metrics']): void {
    // Calculate average frequencies and ages
    const updateFreqMetrics = metrics.byType.updateFrequency;
    const dataAgeMetrics = metrics.byType.dataAge;
    const syncStatusMetrics = metrics.byType.syncStatus;

    // In a real implementation, these would be calculated based on actual data
    // For now, we'll use placeholder values
    updateFreqMetrics.averageFrequency = 3600000; // 1 hour
    dataAgeMetrics.averageAge = 7200000; // 2 hours
    syncStatusMetrics.syncRate = 0.95;
  }

  private calculateScore(metrics: TimelinessResult['metrics']): number {
    if (metrics.totalRules === 0) return 1;

    const typeScores = Object.entries(metrics.byType).map(([type, stats]) => {
      if (stats.total === 0) return 1;
      const score = stats.passed / stats.total;
      const threshold = this.timelinessConfig.thresholds[type as keyof typeof this.timelinessConfig.thresholds];
      return score >= threshold ? score : score * (score / threshold); // Penalize scores below threshold
    });

    return typeScores.reduce((sum, score) => sum + score, 0) / typeScores.length;
  }

  private determineStatus(score: number, metrics: TimelinessResult['metrics']): TimelinessResult['status'] {
    // More weight to sync status
    const syncScore = metrics.byType.syncStatus.total > 0
      ? metrics.byType.syncStatus.passed / metrics.byType.syncStatus.total
      : 1;

    if (score >= 0.95 && syncScore >= 0.98) return 'success';
    if (score >= 0.8 && syncScore >= 0.9) return 'warning';
    return 'error';
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }
} 