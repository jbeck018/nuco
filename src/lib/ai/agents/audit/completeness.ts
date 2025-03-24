import { BaseAgent, AgentConfig, AgentContext, AgentResult } from '../base';
import { AIServiceError } from '../../error';
import { CompletenessConfig, CompletenessResult, completenessResultSchema, ValidationRule } from './types';
import { Redis } from '@upstash/redis';
import { db } from '@/lib/db';
import { agentExecutions } from '@/lib/db/schema/agents';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { AIService } from '../../service';

export class CompletenessAuditor extends BaseAgent {
  private completenessConfig: CompletenessConfig = {
    enabled: false,
    requiredFields: [],
    optionalFields: [],
    thresholds: {
      required: 0.8,
      optional: 0.6,
    },
  };
  private redis: Redis;
  private readonly cacheTTL = 3600; // 1 hour

  constructor() {
    const config: AgentConfig = {
      enabled: false,
      name: 'completeness-auditor',
      description: 'Audits data completeness and field validation',
      id: 'completeness-auditor',
      model: 'gpt-4',
      aiService: new AIService(), // Will be overridden in initialize
    };
    super(config);
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  async initialize(config: AgentConfig & { completenessConfig: CompletenessConfig }): Promise<void> {
    await super.initialize(config);
    this.completenessConfig = config.completenessConfig;
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    let executionId: string | undefined;

    try {
      // Create execution record
      executionId = crypto.randomUUID();
      await db.insert(agentExecutions).values({
        id: executionId,
        agentId: this.state.id,
        status: 'running',
        input: context.metadata,
        metadata: {
          startTime: new Date().toISOString(),
        },
        startedAt: new Date(),
      });

      const data = context.metadata.data as unknown;
      const results = await this.audit(data);

      // Update execution record
      await db
        .update(agentExecutions)
        .set({
          status: 'completed',
          output: results,
          completedAt: new Date(),
        })
        .where(eq(agentExecutions.id, executionId));

      return {
        success: true,
        output: results,
        metadata: {
          executionId,
        },
      };
    } catch (error) {
      // Update execution record with error
      if (executionId) {
        await db
          .update(agentExecutions)
          .set({
            status: 'failed',
            error: {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            },
            completedAt: new Date(),
          })
          .where(eq(agentExecutions.id, executionId));
      }

      throw new AIServiceError(
        error instanceof Error ? error.message : 'Failed to execute completeness audit',
        'custom',
        'completeness_audit_error'
      );
    }
  }

  async audit(data: unknown): Promise<CompletenessResult> {
    const startTime = Date.now();
    const issues: CompletenessResult['issues'] = [];
    const recommendations: string[] = [];

    // Convert data to array if single object
    const dataArray = Array.isArray(data) ? data : [data];
    const dataPoints = dataArray.length;

    // Initialize metrics
    const metrics = {
      totalFields: this.completenessConfig.requiredFields.length + this.completenessConfig.optionalFields.length,
      requiredFields: this.completenessConfig.requiredFields.length,
      optionalFields: this.completenessConfig.optionalFields.length,
      completedRequired: 0,
      completedOptional: 0,
      completionRate: 0,
      requiredCompletionRate: 0,
      optionalCompletionRate: 0,
    };

    // Process each data point
    for (const item of dataArray) {
      const record = item as Record<string, unknown>;

      // Check required fields
      for (const field of this.completenessConfig.requiredFields) {
        const value = record[field];
        const rule = this.completenessConfig.rules?.find(r => r.field === field);
        
        if (this.isFieldValid(value, rule?.validation)) {
          metrics.completedRequired++;
        } else {
          issues.push({
            field,
            type: 'required',
            status: this.getFieldStatus(value, rule?.validation),
            message: this.getFieldMessage(field, value, rule?.validation),
            value,
          });
        }
      }

      // Check optional fields
      for (const field of this.completenessConfig.optionalFields) {
        const value = record[field];
        const rule = this.completenessConfig.rules?.find(r => r.field === field);
        
        if (this.isFieldValid(value, rule?.validation)) {
          metrics.completedOptional++;
        } else if (value !== undefined) {
          issues.push({
            field,
            type: 'optional',
            status: this.getFieldStatus(value, rule?.validation),
            message: this.getFieldMessage(field, value, rule?.validation),
            value,
          });
        }
      }
    }

    // Calculate completion rates
    metrics.completedRequired = Math.round(metrics.completedRequired / dataPoints);
    metrics.completedOptional = Math.round(metrics.completedOptional / dataPoints);
    metrics.requiredCompletionRate = metrics.completedRequired / metrics.requiredFields;
    metrics.optionalCompletionRate = metrics.completedOptional / metrics.optionalFields;
    metrics.completionRate = (metrics.completedRequired + metrics.completedOptional) / metrics.totalFields;

    // Determine status and generate recommendations
    const status = this.determineStatus(metrics, issues);
    this.generateRecommendations(metrics, issues, recommendations);

    const result: CompletenessResult = {
      status,
      score: metrics.completionRate,
      metrics,
      issues,
      recommendations,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        dataPoints,
      },
    };

    // Validate result
    return completenessResultSchema.parse(result);
  }

  private isFieldValid(value: unknown, validation?: ValidationRule): boolean {
    if (value === undefined || value === null) return false;

    if (!validation) return true;

    switch (validation.type) {
      case 'string':
        if (typeof value !== 'string') return false;
        if (validation.min !== undefined && value.length < validation.min) return false;
        if (validation.max !== undefined && value.length > validation.max) return false;
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) return false;
        break;

      case 'number':
        if (typeof value !== 'number') return false;
        if (validation.min !== undefined && value < validation.min) return false;
        if (validation.max !== undefined && value > validation.max) return false;
        break;

      case 'boolean':
        if (typeof value !== 'boolean') return false;
        break;

      case 'date':
        if (typeof value !== 'string') return false;
        const date = new Date(value);
        if (isNaN(date.getTime())) return false;
        break;

      case 'email':
        if (typeof value !== 'string') return false;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
        break;

      case 'url':
        if (typeof value !== 'string') return false;
        try {
          new URL(value);
        } catch {
          return false;
        }
        break;

      case 'phone':
        if (typeof value !== 'string') return false;
        if (!/^\+?[\d\s-()]+$/.test(value)) return false;
        break;
    }

    return true;
  }

  private getFieldStatus(value: unknown, validation?: ValidationRule): CompletenessResult['issues'][0]['status'] {
    if (value === undefined || value === null) return 'missing';
    if (!this.isFieldValid(value, validation)) return 'invalid';
    return 'incomplete';
  }

  private getFieldMessage(field: string, value: unknown, validation?: ValidationRule): string {
    if (value === undefined || value === null) {
      return `Field "${field}" is missing`;
    }

    if (!validation) return `Field "${field}" is invalid`;

    switch (validation.type) {
      case 'string':
        if (typeof value !== 'string') return `Field "${field}" must be a string`;
        if (validation.min !== undefined && value.length < validation.min) {
          return `Field "${field}" must be at least ${validation.min} characters`;
        }
        if (validation.max !== undefined && value.length > validation.max) {
          return `Field "${field}" must be at most ${validation.max} characters`;
        }
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          return `Field "${field}" does not match required pattern`;
        }
        break;

      case 'number':
        if (typeof value !== 'number') return `Field "${field}" must be a number`;
        if (validation.min !== undefined && value < validation.min) {
          return `Field "${field}" must be at least ${validation.min}`;
        }
        if (validation.max !== undefined && value > validation.max) {
          return `Field "${field}" must be at most ${validation.max}`;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') return `Field "${field}" must be a boolean`;
        break;

      case 'date':
        if (typeof value !== 'string') return `Field "${field}" must be a date string`;
        const date = new Date(value);
        if (isNaN(date.getTime())) return `Field "${field}" must be a valid date`;
        break;

      case 'email':
        if (typeof value !== 'string') return `Field "${field}" must be an email string`;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `Field "${field}" must be a valid email`;
        break;

      case 'url':
        if (typeof value !== 'string') return `Field "${field}" must be a URL string`;
        try {
          new URL(value);
        } catch {
          return `Field "${field}" must be a valid URL`;
        }
        break;

      case 'phone':
        if (typeof value !== 'string') return `Field "${field}" must be a phone number string`;
        if (!/^\+?[\d\s-()]+$/.test(value)) return `Field "${field}" must be a valid phone number`;
        break;
    }

    return `Field "${field}" is invalid`;
  }

  private determineStatus(metrics: CompletenessResult['metrics'], issues: CompletenessResult['issues']): CompletenessResult['status'] {
    const requiredRate = metrics.requiredCompletionRate;
    const optionalRate = metrics.optionalCompletionRate;
    const requiredThreshold = this.completenessConfig.thresholds.required;
    const optionalThreshold = this.completenessConfig.thresholds.optional;

    if (requiredRate >= requiredThreshold && optionalRate >= optionalThreshold) {
      return 'passed';
    }

    if (requiredRate < requiredThreshold * 0.5 || optionalRate < optionalThreshold * 0.5) {
      return 'failed';
    }

    return 'warning';
  }

  private generateRecommendations(
    metrics: CompletenessResult['metrics'],
    issues: CompletenessResult['issues'],
    recommendations: string[]
  ): void {
    // Add recommendations based on completion rates
    if (metrics.requiredCompletionRate < this.completenessConfig.thresholds.required) {
      recommendations.push(
        `Required field completion rate (${(metrics.requiredCompletionRate * 100).toFixed(1)}%) is below threshold (${(this.completenessConfig.thresholds.required * 100).toFixed(1)}%)`
      );
    }

    if (metrics.optionalCompletionRate < this.completenessConfig.thresholds.optional) {
      recommendations.push(
        `Optional field completion rate (${(metrics.optionalCompletionRate * 100).toFixed(1)}%) is below threshold (${(this.completenessConfig.thresholds.optional * 100).toFixed(1)}%)`
      );
    }

    // Add recommendations for most common issues
    const issueCounts = issues.reduce((acc, issue) => {
      acc[issue.field] = (acc[issue.field] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedFields = Object.entries(issueCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([field]) => field);

    if (sortedFields.length > 0) {
      recommendations.push(
        `Focus on improving data quality for fields: ${sortedFields.join(', ')}`
      );
    }

    // Add validation-specific recommendations
    const validationIssues = issues.filter(issue => issue.status === 'invalid');
    if (validationIssues.length > 0) {
      recommendations.push(
        `Review validation rules for ${validationIssues.length} fields with invalid data`
      );
    }
  }
} 