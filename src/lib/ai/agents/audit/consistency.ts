import { BaseAgent, AgentConfig, AgentContext, AgentResult } from '../base';
import { AIServiceError } from '../../error';
import { ConsistencyConfig, ConsistencyResult, consistencyResultSchema } from './types';
import { Redis } from '@upstash/redis';
import { db } from '@/lib/db';
import { agentExecutions } from '@/lib/db/schema/agents';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { AIService } from '../../service';

export class ConsistencyAuditor extends BaseAgent {
  private consistencyConfig: ConsistencyConfig = {
    enabled: false,
    rules: [],
    thresholds: {
      crossField: 0.95,
      businessRule: 0.98,
      format: 0.95,
      temporal: 0.9,
    },
  };
  private redis: Redis;
  private readonly cacheTTL = 3600; // 1 hour

  constructor() {
    const config: AgentConfig = {
      enabled: false,
      name: 'consistency-auditor',
      description: 'Audits data consistency across fields and rules',
      id: 'consistency-auditor',
      model: 'gpt-4',
      aiService: new AIService(), // Will be overridden in initialize
    };
    super(config);
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  async initialize(config: AgentConfig & { consistencyConfig: ConsistencyConfig }): Promise<void> {
    await super.initialize(config);
    this.consistencyConfig = config.consistencyConfig;
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

      throw new AIServiceError('Consistency audit failed');
    }
  }

  private async audit(data: unknown): Promise<ConsistencyResult> {
    const startTime = Date.now();
    const issues: ConsistencyResult['issues'] = [];
    const recommendations: ConsistencyResult['recommendations'] = [];
    const metrics = {
      totalRules: 0,
      passedRules: 0,
      failedRules: 0,
      byType: {
        crossField: { total: 0, passed: 0, failed: 0 },
        businessRule: { total: 0, passed: 0, failed: 0 },
        format: { total: 0, passed: 0, failed: 0 },
        temporal: { total: 0, passed: 0, failed: 0 },
      },
    };

    // Process each rule
    for (const rule of this.consistencyConfig.rules) {
      metrics.totalRules++;
      const metricType = this.getMetricType(rule.type);
      metrics.byType[metricType].total++;

      const value = this.getFieldValue(data, rule.field) ?? null;
      const relatedValues = this.getRelatedFieldValues(data, rule.relatedFields);

      if (this.isRuleValid(value, relatedValues, rule)) {
        metrics.passedRules++;
        metrics.byType[metricType].passed++;
      } else {
        metrics.failedRules++;
        metrics.byType[metricType].failed++;

        const issue = this.createIssue(rule, value, relatedValues);
        issues.push(issue);

        const recommendation = this.createRecommendation(rule);
        recommendations.push(recommendation);
      }
    }

    // Calculate overall score
    const score = this.calculateScore(metrics);

    // Determine status
    const status = this.determineStatus(score, metrics);

    const result: ConsistencyResult = {
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
    return consistencyResultSchema.parse(result) as ConsistencyResult;
  }

  private getMetricType(ruleType: ConsistencyConfig['rules'][number]['type']): keyof ConsistencyResult['metrics']['byType'] {
    const typeMap: Record<typeof ruleType, keyof ConsistencyResult['metrics']['byType']> = {
      'cross-field': 'crossField',
      'business-rule': 'businessRule',
      'format': 'format',
      'temporal': 'temporal'
    };
    return typeMap[ruleType];
  }

  private getFieldValue(data: unknown, field: string): unknown {
    if (typeof data !== 'object' || data === null) return undefined;
    return (data as Record<string, unknown>)[field];
  }

  private getRelatedFieldValues(data: unknown, fields?: string[]): Record<string, unknown> {
    if (!fields || typeof data !== 'object' || data === null) return {};
    
    return fields.reduce((acc, field) => {
      acc[field] = (data as Record<string, unknown>)[field];
      return acc;
    }, {} as Record<string, unknown>);
  }

  private isRuleValid(value: unknown, relatedValues: Record<string, unknown>, rule: ConsistencyConfig['rules'][number]): boolean {
    if (value === undefined) return false;

    const { type, constraints } = rule;

    switch (type) {
      case 'cross-field':
        if (!constraints?.relation) return true;
        return this.validateCrossField(value, relatedValues, constraints.relation);

      case 'business-rule':
        if (!constraints?.customValidation) return true;
        return constraints.customValidation(value, relatedValues);

      case 'format':
        if (!constraints?.pattern) return true;
        return typeof value === 'string' && new RegExp(constraints.pattern).test(value);

      case 'temporal':
        if (!constraints?.timeWindow) return true;
        return this.validateTemporal(value, relatedValues, constraints.timeWindow);
    }

    return true;
  }

  private validateCrossField(value: unknown, relatedValues: Record<string, unknown>, relation: string): boolean {
    const relatedValue = Object.values(relatedValues)[0];
    if (relatedValue === undefined) return true;

    switch (relation) {
      case 'equal':
        return value === relatedValue;
      case 'greater':
        return typeof value === 'number' && typeof relatedValue === 'number' && value > relatedValue;
      case 'less':
        return typeof value === 'number' && typeof relatedValue === 'number' && value < relatedValue;
      case 'dependent':
        return value !== undefined && value !== null;
      default:
        return true;
    }
  }

  private validateTemporal(value: unknown, relatedValues: Record<string, unknown>, timeWindow: number): boolean {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    if (isNaN(date.getTime())) return false;

    const relatedDates = Object.values(relatedValues)
      .map(v => typeof v === 'string' ? new Date(v) : null)
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

    if (relatedDates.length === 0) return true;

    const timeDiffs = relatedDates.map(d => Math.abs(date.getTime() - d.getTime()));
    return timeDiffs.every(diff => diff <= timeWindow);
  }

  private createIssue(
    rule: ConsistencyConfig['rules'][number],
    value: unknown,
    relatedValues: Record<string, unknown>
  ): ConsistencyResult['issues'][0] {
    const { field, type, constraints } = rule;
    let expected = '';
    const actual = typeof value === 'string' ? value : JSON.stringify(value);
    const severity: 'low' | 'medium' | 'high' = type === 'business-rule' ? 'high' : 'medium';

    switch (type) {
      case 'cross-field':
        expected = constraints?.relation
          ? `Value should be ${constraints.relation} to related field(s)`
          : 'Consistent with related fields';
        break;

      case 'business-rule':
        expected = 'Should satisfy business rule constraints';
        break;

      case 'format':
        expected = constraints?.pattern
          ? `Should match pattern: ${constraints.pattern}`
          : 'Should match required format';
        break;

      case 'temporal':
        expected = constraints?.timeWindow
          ? `Within ${constraints.timeWindow}ms of related timestamps`
          : 'Within acceptable time window';
        break;
    }

    return {
      field,
      type,
      value,
      relatedFields: relatedValues,
      expected,
      actual,
      severity,
    };
  }

  private createRecommendation(rule: ConsistencyConfig['rules'][number]): ConsistencyResult['recommendations'][0] {
    const { field, type } = rule;
    let message = '';
    let priority: 'low' | 'medium' | 'high' = 'medium';

    switch (type) {
      case 'cross-field':
        message = `Ensure ${field} is consistent with related fields`;
        priority = 'medium';
        break;

      case 'business-rule':
        message = `Ensure ${field} satisfies business rule constraints`;
        priority = 'high';
        break;

      case 'format':
        message = `Ensure ${field} follows the required format`;
        priority = 'medium';
        break;

      case 'temporal':
        message = `Ensure ${field} is within acceptable time window`;
        priority = 'low';
        break;
    }

    return {
      field,
      type,
      message,
      priority,
    };
  }

  private calculateScore(metrics: ConsistencyResult['metrics']): number {
    if (metrics.totalRules === 0) return 1;

    const typeScores = Object.entries(metrics.byType).map(([type, stats]) => {
      if (stats.total === 0) return 1;
      const score = stats.passed / stats.total;
      const threshold = this.consistencyConfig.thresholds[type as keyof typeof this.consistencyConfig.thresholds];
      return score >= threshold ? score : score * (score / threshold); // Penalize scores below threshold
    });

    return typeScores.reduce((sum, score) => sum + score, 0) / typeScores.length;
  }

  private determineStatus(score: number, metrics: ConsistencyResult['metrics']): ConsistencyResult['status'] {
    // More weight to business rules
    const businessRuleScore = metrics.byType.businessRule.total > 0
      ? metrics.byType.businessRule.passed / metrics.byType.businessRule.total
      : 1;

    if (score >= 0.95 && businessRuleScore >= 0.98) return 'success';
    if (score >= 0.8 && businessRuleScore >= 0.9) return 'warning';
    return 'error';
  }
} 