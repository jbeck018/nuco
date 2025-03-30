import { BaseAgent, AgentConfig, AgentContext, AgentResult } from '../base';
import { AIServiceError } from '../../error';
import { AccuracyConfig, AccuracyResult, accuracyResultSchema } from './types';
import { Redis } from '@upstash/redis';
import { db } from '@/lib/db';
import { agentExecutions } from '@/lib/db/schema/agents';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { AIService } from '../../service';

export class AccuracyAuditor extends BaseAgent {
  private accuracyConfig: AccuracyConfig = {
    enabled: false,
    rules: [],
    thresholds: {
      numeric: 0.95,
      categorical: 0.98,
      text: 0.9,
      date: 0.95,
      boolean: 0.99,
    },
  };
  private redis: Redis;
  private readonly cacheTTL = 3600; // 1 hour

  constructor() {
    const config: AgentConfig = {
      enabled: false,
      name: 'accuracy-auditor',
      description: 'Audits data accuracy and validation',
      id: 'accuracy-auditor',
      model: 'gpt-4',
      aiService: new AIService(), // Will be overridden in initialize
    };
    super(config);
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  async initialize(config: AgentConfig & { accuracyConfig: AccuracyConfig }): Promise<void> {
    await super.initialize(config);
    this.accuracyConfig = config.accuracyConfig;
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const executionId = crypto.randomUUID();

    try {
      if (!this.config.id) {
        throw new AIServiceError('Agent ID is required for execution');
      }

      // Create execution record
      await db.insert(agentExecutions).values({
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

      throw new AIServiceError('Accuracy audit failed');
    }
  }

  private async audit(data: unknown): Promise<AccuracyResult> {
    const startTime = Date.now();
    const issues: AccuracyResult['issues'] = [];
    const recommendations: AccuracyResult['recommendations'] = [];
    const metrics = {
      totalFields: 0,
      validFields: 0,
      invalidFields: 0,
      byType: {
        numeric: { total: 0, valid: 0, invalid: 0 },
        categorical: { total: 0, valid: 0, invalid: 0 },
        text: { total: 0, valid: 0, invalid: 0 },
        date: { total: 0, valid: 0, invalid: 0 },
        boolean: { total: 0, valid: 0, invalid: 0 },
      },
    };

    // Process each rule
    for (const rule of this.accuracyConfig.rules) {
      const value = this.getFieldValue(data, rule.field);
      metrics.totalFields++;
      metrics.byType[rule.type].total++;

      if (this.isFieldValid(value, rule)) {
        metrics.validFields++;
        metrics.byType[rule.type].valid++;
      } else {
        metrics.invalidFields++;
        metrics.byType[rule.type].invalid++;

        const issue = this.createIssue(rule, value);
        issues.push(issue);

        const recommendation = this.createRecommendation(rule, value);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }

    // Calculate overall score
    const score = this.calculateScore(metrics);

    // Determine status
    const status = this.determineStatus(score, metrics);

    const result: AccuracyResult = {
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
    return accuracyResultSchema.parse(result) as AccuracyResult;
  }

  private getFieldValue(data: unknown, field: string): unknown {
    if (typeof data !== 'object' || data === null) return undefined;
    return (data as Record<string, unknown>)[field];
  }

  private isFieldValid(value: unknown, rule: AccuracyConfig['rules'][number]): boolean {
    if (value === undefined || value === null) return false;

    const { type, constraints } = rule;

    switch (type) {
      case 'numeric':
        if (typeof value !== 'number') return false;
        if (constraints?.min !== undefined && value < constraints.min) return false;
        if (constraints?.max !== undefined && value > constraints.max) return false;
        break;

      case 'categorical':
        if (typeof value !== 'string') return false;
        if (constraints?.allowedValues && !constraints.allowedValues.includes(value)) return false;
        break;

      case 'text':
        if (typeof value !== 'string') return false;
        if (constraints?.pattern && !new RegExp(constraints.pattern).test(value)) return false;
        break;

      case 'date':
        if (typeof value !== 'string') return false;
        const date = new Date(value);
        if (isNaN(date.getTime())) return false;
        if (constraints?.format) {
          // Add format validation logic here if needed
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') return false;
        break;
    }

    if (constraints?.customValidation) {
      return constraints.customValidation(value);
    }

    return true;
  }

  private createIssue(rule: AccuracyConfig['rules'][number], value: unknown): AccuracyResult['issues'][0] {
    const { field, type, constraints } = rule;
    let expected = '';
    const actual = typeof value === 'string' ? value : JSON.stringify(value);
    const severity: 'low' | 'medium' | 'high' = 'low';

    switch (type) {
      case 'numeric':
        expected = constraints?.min !== undefined && constraints?.max !== undefined
          ? `between ${constraints.min} and ${constraints.max}`
          : constraints?.min !== undefined
          ? `>= ${constraints.min}`
          : constraints?.max !== undefined
          ? `<= ${constraints.max}`
          : 'a valid number';
        break;

      case 'categorical':
        expected = constraints?.allowedValues
          ? `one of: ${constraints.allowedValues.join(', ')}`
          : 'a valid string';
        break;

      case 'text':
        expected = constraints?.pattern
          ? `matching pattern: ${constraints.pattern}`
          : 'a valid string';
        break;

      case 'date':
        expected = constraints?.format
          ? `in format: ${constraints.format}`
          : 'a valid date';
        break;

      case 'boolean':
        expected = 'true or false';
        break;
    }

    return {
      field,
      type,
      value: value ?? null,
      expected,
      actual,
      severity,
    };
  }

  private createRecommendation(rule: AccuracyConfig['rules'][number], value: unknown): AccuracyResult['recommendations'][0] | null {
    const { field, type } = rule;
    let message = '';
    let priority: 'low' | 'medium' | 'high' = 'low';

    switch (type) {
      case 'numeric':
        message = `Ensure ${field} contains a valid numeric value`;
        priority = 'high';
        break;

      case 'categorical':
        message = `Ensure ${field} contains one of the allowed values`;
        priority = 'medium';
        break;

      case 'text':
        message = `Ensure ${field} contains valid text matching the required pattern`;
        priority = 'medium';
        break;

      case 'date':
        message = `Ensure ${field} contains a valid date in the required format`;
        priority = 'high';
        break;

      case 'boolean':
        message = `Ensure ${field} contains a valid boolean value`;
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

  private calculateScore(metrics: AccuracyResult['metrics']): number {
    if (metrics.totalFields === 0) return 1;

    const typeScores = Object.entries(metrics.byType).map(([type, stats]) => {
      if (stats.total === 0) return 1;
      return stats.valid / stats.total;
    });

    return typeScores.reduce((sum, score) => sum + score, 0) / typeScores.length;
  }

  private determineStatus(score: number, metrics: AccuracyResult['metrics']): AccuracyResult['status'] {
    if (score >= 0.95) return 'success';
    if (score >= 0.8) return 'warning';
    return 'error';
  }
} 