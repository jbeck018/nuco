import { BaseAgent, AgentConfig, AgentContext, AgentResult, AgentState } from '../base';
import { AIServiceError } from '../../error';
import { 
  ActivityAuditConfig, 
  ActivityAuditResult, 
  activityAuditResultSchema,
  CompletenessResult,
  AccuracyResult,
  ConsistencyResult,
  TimelinessResult
} from './types';
import { CompletenessAuditor } from './completeness';
import { AccuracyAuditor } from './accuracy';
import { ConsistencyAuditor } from './consistency';
import { TimelinessAuditor } from './timeliness';
import { db } from '@/lib/db';
import { agentExecutions } from '@/lib/db/schema/agents';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { AIService } from '../../service';

export class ActivityAuditor extends BaseAgent {
  private activityConfig: ActivityAuditConfig = {
    enabled: false,
    completeness: {
      enabled: true,
      requiredFields: [],
      optionalFields: [],
      thresholds: { required: 0.95, optional: 0.9 },
    },
    accuracy: {
      enabled: true,
      rules: [],
      thresholds: {
        numeric: 0.95,
        categorical: 0.98,
        text: 0.9,
        date: 0.95,
        boolean: 0.99,
      },
    },
    consistency: {
      enabled: true,
      rules: [],
      thresholds: {
        crossField: 0.95,
        businessRule: 0.98,
        format: 0.95,
        temporal: 0.9,
      },
    },
    timeliness: {
      enabled: true,
      rules: [],
      thresholds: {
        updateFrequency: 0.95,
        dataAge: 0.9,
        syncStatus: 0.98,
      },
    },
    rules: [],
    thresholds: {
      completeness: 0.95,
      accuracy: 0.98,
      consistency: 0.95,
      timeliness: 0.9,
      activitySpecific: 0.95,
    },
  };

  private completenessAuditor: CompletenessAuditor;
  private accuracyAuditor: AccuracyAuditor;
  private consistencyAuditor: ConsistencyAuditor;
  private timelinessAuditor: TimelinessAuditor;

  constructor() {
    const config: AgentConfig = {
      enabled: false,
      name: 'activity-auditor',
      description: 'Audits activity data quality',
      id: 'activity-auditor',
      model: 'gpt-4',
      aiService: new AIService(), // Will be overridden in initialize
    };
    super(config);

    this.completenessAuditor = new CompletenessAuditor();
    this.accuracyAuditor = new AccuracyAuditor();
    this.consistencyAuditor = new ConsistencyAuditor();
    this.timelinessAuditor = new TimelinessAuditor();
  }

  async initialize(config: AgentConfig & { activityConfig: ActivityAuditConfig }): Promise<void> {
    await super.initialize(config);
    this.activityConfig = config.activityConfig;

    // Initialize sub-auditors
    await this.completenessAuditor.initialize({
      ...config,
      completenessConfig: this.activityConfig.completeness,
    });
    await this.accuracyAuditor.initialize({
      ...config,
      accuracyConfig: this.activityConfig.accuracy,
    });
    await this.consistencyAuditor.initialize({
      ...config,
      consistencyConfig: this.activityConfig.consistency,
    });
    await this.timelinessAuditor.initialize({
      ...config,
      timelinessConfig: this.activityConfig.timeliness,
    });
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

      throw new AIServiceError('Activity audit failed');
    }
  }

  private async audit(data: unknown): Promise<ActivityAuditResult> {
    const startTime = Date.now();
    const issues: ActivityAuditResult['issues'] = [];
    const recommendations: ActivityAuditResult['recommendations'] = [];

    // Create context for sub-audits
    const context: AgentContext = {
      data,
      messages: [],
      state: {
        id: crypto.randomUUID(),
        status: 'running',
        lastUpdated: new Date(),
        metadata: {},
      },
      config: {
        id: this.config.id,
        name: this.config.name,
        description: this.config.description,
        model: this.config.model,
        aiService: this.config.aiService,
      },
      metadata: {},
      executionId: crypto.randomUUID()
    };

    // Run sub-audits
    const [completenessResult, accuracyResult, consistencyResult, timelinessResult] = await Promise.all([
      this.completenessAuditor.execute(context),
      this.accuracyAuditor.execute(context),
      this.consistencyAuditor.execute(context),
      this.timelinessAuditor.execute(context),
    ]);

    // Add sub-audit results with type assertions
    const completenessOutput = completenessResult.output as CompletenessResult;
    const accuracyOutput = accuracyResult.output as AccuracyResult;
    const consistencyOutput = consistencyResult.output as ConsistencyResult;
    const timelinessOutput = timelinessResult.output as TimelinessResult;

    // Ensure all issues have required fields
    const processedIssues: ActivityAuditResult['issues'] = [
      ...completenessOutput.issues.map(issue => ({
        ...issue,
        value: issue.value ?? null,
      })),
      ...accuracyOutput.issues.map(issue => ({
        ...issue,
        value: issue.value ?? null,
      })),
      ...consistencyOutput.issues.map(issue => ({
        ...issue,
        value: issue.value ?? null,
      })),
      ...timelinessOutput.issues.map(issue => ({
        ...issue,
        value: issue.value ?? null,
      })),
    ];

    issues.push(...processedIssues);

    recommendations.push(...completenessOutput.recommendations);
    recommendations.push(...accuracyOutput.recommendations);
    recommendations.push(...consistencyOutput.recommendations);
    recommendations.push(...timelinessOutput.recommendations);

    // Run activity-specific rules
    const activitySpecificMetrics = {
      totalRules: 0,
      passedRules: 0,
      failedRules: 0,
      byType: {
        activityType: { total: 0, passed: 0, failed: 0 },
        duration: { total: 0, passed: 0, failed: 0 },
        outcome: { total: 0, passed: 0, failed: 0 },
        date: { total: 0, passed: 0, failed: 0 },
      },
    };

    for (const rule of this.activityConfig.rules) {
      activitySpecificMetrics.totalRules++;
      const value = this.getFieldValue(data, rule.field);

      if (this.isActivityRuleValid(value, rule)) {
        activitySpecificMetrics.passedRules++;
        this.incrementMetric(activitySpecificMetrics.byType, rule.constraints);
      } else {
        activitySpecificMetrics.failedRules++;
        const issue = this.createActivityIssue(rule, value);
        issues.push(issue);

        const recommendation = this.createActivityRecommendation(rule);
        recommendations.push(recommendation);
      }
    }

    // Calculate overall score
    const score = this.calculateScore(
      completenessOutput.score,
      accuracyOutput.score,
      consistencyOutput.score,
      timelinessOutput.score,
      activitySpecificMetrics
    );

    // Determine status
    const status = this.determineStatus(score);

    const result: ActivityAuditResult = {
      status,
      score,
      metrics: {
        completeness: completenessOutput.metrics,
        accuracy: accuracyOutput.metrics,
        consistency: consistencyOutput.metrics,
        timeliness: timelinessOutput.metrics,
        activitySpecific: activitySpecificMetrics,
      },
      issues,
      recommendations,
      metadata: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        version: '1.0.0',
      },
    };

    // Validate result
    return activityAuditResultSchema.parse(result) as ActivityAuditResult;
  }

  private getFieldValue(data: unknown, field: string): unknown {
    if (typeof data !== 'object' || data === null) return undefined;
    return (data as Record<string, unknown>)[field];
  }

  private isActivityRuleValid(value: unknown, rule: ActivityAuditConfig['rules'][number]): boolean {
    if (value === undefined) return false;

    const { constraints } = rule;
    if (!constraints) return true;

    if (constraints.activityType && typeof value === 'string') {
      return this.isValidActivityType(value, constraints.activityType);
    }

    if (constraints.duration && typeof value === 'number') {
      return this.isValidDuration(value, constraints.duration);
    }

    if (constraints.outcome && typeof value === 'string') {
      return this.isValidOutcome(value, constraints.outcome);
    }

    if (constraints.date && value instanceof Date) {
      return this.isValidDate(value, constraints.date);
    }

    if (constraints.customValidation) {
      return constraints.customValidation(value);
    }

    return true;
  }

  private isValidActivityType(type: string, constraints: NonNullable<ActivityAuditConfig['rules'][number]['constraints']>['activityType']): boolean {
    if (!constraints) return true;
    if (!constraints.allowedTypes.includes(type)) return false;
    if (constraints.requiredTypes?.includes(type)) return true;
    return true;
  }

  private isValidDuration(duration: number, constraints: NonNullable<ActivityAuditConfig['rules'][number]['constraints']>['duration']): boolean {
    if (!constraints) return true;
    if (constraints.min !== undefined && duration < constraints.min) return false;
    if (constraints.max !== undefined && duration > constraints.max) return false;
    return true;
  }

  private isValidOutcome(outcome: string, constraints: NonNullable<ActivityAuditConfig['rules'][number]['constraints']>['outcome']): boolean {
    if (!constraints) return true;
    if (!constraints.allowedOutcomes.includes(outcome)) return false;
    if (constraints.requiredOutcomes?.includes(outcome)) return true;
    return true;
  }

  private isValidDate(date: Date, constraints: NonNullable<ActivityAuditConfig['rules'][number]['constraints']>['date']): boolean {
    if (!constraints) return true;
    if (constraints.minDate && date < constraints.minDate) return false;
    if (constraints.maxDate && date > constraints.maxDate) return false;
    if (constraints.required && date === undefined) return false;
    return true;
  }

  private incrementMetric(
    metrics: ActivityAuditResult['metrics']['activitySpecific']['byType'],
    constraints?: ActivityAuditConfig['rules'][number]['constraints']
  ): void {
    if (!constraints) return;

    if (constraints.activityType) metrics.activityType.passed++;
    if (constraints.duration) metrics.duration.passed++;
    if (constraints.outcome) metrics.outcome.passed++;
    if (constraints.date) metrics.date.passed++;
  }

  private createActivityIssue(
    rule: ActivityAuditConfig['rules'][number],
    value: unknown
  ): ActivityAuditResult['issues'][0] {
    const { field, constraints } = rule;
    let expected = '';
    const actual = String(value);
    let severity: 'low' | 'medium' | 'high' = 'medium';

    if (constraints?.activityType) {
      expected = `Valid activity type (${constraints.activityType.allowedTypes.join(', ')})`;
      severity = 'high';
    } else if (constraints?.duration) {
      const { min, max, unit = 'minutes' } = constraints.duration;
      expected = `Duration between ${min ?? 0} and ${max ?? 'unlimited'} ${unit}`;
      severity = 'medium';
    } else if (constraints?.outcome) {
      expected = `Valid outcome (${constraints.outcome.allowedOutcomes.join(', ')})`;
      severity = 'high';
    } else if (constraints?.date) {
      const { minDate, maxDate } = constraints.date;
      expected = `Date between ${minDate?.toISOString() ?? 'any'} and ${maxDate?.toISOString() ?? 'any'}`;
      severity = 'medium';
    }

    return {
      field,
      type: 'activity-specific',
      value,
      expected,
      actual,
      severity,
    };
  }

  private createActivityRecommendation(
    rule: ActivityAuditConfig['rules'][number]
  ): ActivityAuditResult['recommendations'][0] {
    const { field, constraints } = rule;
    let message = '';
    let priority: 'low' | 'medium' | 'high' = 'medium';

    if (constraints?.activityType) {
      message = `Ensure ${field} is one of the allowed activity types (${constraints.activityType.allowedTypes.join(', ')})`;
      priority = 'high';
    } else if (constraints?.duration) {
      const { min, max, unit = 'minutes' } = constraints.duration;
      message = `Ensure ${field} is within the valid duration range (${min ?? 0} to ${max ?? 'unlimited'} ${unit})`;
      priority = 'medium';
    } else if (constraints?.outcome) {
      message = `Ensure ${field} is one of the allowed outcomes (${constraints.outcome.allowedOutcomes.join(', ')})`;
      priority = 'high';
    } else if (constraints?.date) {
      const { minDate, maxDate } = constraints.date;
      message = `Ensure ${field} is within the valid date range (${minDate?.toISOString() ?? 'any'} to ${maxDate?.toISOString() ?? 'any'})`;
      priority = 'medium';
    }

    return {
      field,
      type: 'activity-specific',
      message,
      priority,
    };
  }

  private calculateScore(
    completenessScore: number,
    accuracyScore: number,
    consistencyScore: number,
    timelinessScore: number,
    activitySpecificMetrics: ActivityAuditResult['metrics']['activitySpecific']
  ): number {
    const activitySpecificScore =
      activitySpecificMetrics.totalRules > 0
        ? activitySpecificMetrics.passedRules / activitySpecificMetrics.totalRules
        : 1;

    const { thresholds } = this.activityConfig;
    const scores = [
      { score: completenessScore, threshold: thresholds.completeness },
      { score: accuracyScore, threshold: thresholds.accuracy },
      { score: consistencyScore, threshold: thresholds.consistency },
      { score: timelinessScore, threshold: thresholds.timeliness },
      { score: activitySpecificScore, threshold: thresholds.activitySpecific },
    ];

    return scores.reduce((sum, { score, threshold }) => {
      const weightedScore = score >= threshold ? score : score * (score / threshold);
      return sum + weightedScore;
    }, 0) / scores.length;
  }

  private determineStatus(score: number): ActivityAuditResult['status'] {
    if (score >= 0.95) return 'success';
    if (score >= 0.8) return 'warning';
    return 'error';
  }
} 