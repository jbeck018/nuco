import { BaseAgent, AgentConfig, AgentContext, AgentResult, AgentState } from '../base';
import { AIServiceError } from '../../error';
import { 
  DealAuditConfig, 
  DealAuditResult, 
  dealAuditResultSchema,
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

export class DealAuditor extends BaseAgent {
  private dealConfig: DealAuditConfig = {
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
      dealSpecific: 0.95,
    },
  };

  private completenessAuditor: CompletenessAuditor;
  private accuracyAuditor: AccuracyAuditor;
  private consistencyAuditor: ConsistencyAuditor;
  private timelinessAuditor: TimelinessAuditor;

  constructor() {
    const config: AgentConfig = {
      enabled: false,
      name: 'deal-auditor',
      description: 'Audits deal data quality',
      id: 'deal-auditor',
      model: 'gpt-4',
      aiService: new AIService(), // Will be overridden in initialize
    };
    super(config);

    this.completenessAuditor = new CompletenessAuditor();
    this.accuracyAuditor = new AccuracyAuditor();
    this.consistencyAuditor = new ConsistencyAuditor();
    this.timelinessAuditor = new TimelinessAuditor();
  }

  async initialize(config: AgentConfig & { dealConfig: DealAuditConfig }): Promise<void> {
    await super.initialize(config);
    this.dealConfig = config.dealConfig;

    // Initialize sub-auditors
    await this.completenessAuditor.initialize({
      ...config,
      completenessConfig: this.dealConfig.completeness,
    });
    await this.accuracyAuditor.initialize({
      ...config,
      accuracyConfig: this.dealConfig.accuracy,
    });
    await this.consistencyAuditor.initialize({
      ...config,
      consistencyConfig: this.dealConfig.consistency,
    });
    await this.timelinessAuditor.initialize({
      ...config,
      timelinessConfig: this.dealConfig.timeliness,
    });
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

      throw new AIServiceError('Deal audit failed');
    }
  }

  private async audit(data: unknown): Promise<DealAuditResult> {
    const startTime = Date.now();
    const issues: DealAuditResult['issues'] = [];
    const recommendations: DealAuditResult['recommendations'] = [];

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
    const processedIssues: DealAuditResult['issues'] = [
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

    // Run deal-specific rules
    const dealSpecificMetrics = {
      totalRules: 0,
      passedRules: 0,
      failedRules: 0,
      byType: {
        dealAmount: { total: 0, passed: 0, failed: 0 },
        stage: { total: 0, passed: 0, failed: 0 },
        probability: { total: 0, passed: 0, failed: 0 },
        closeDate: { total: 0, passed: 0, failed: 0 },
      },
    };

    for (const rule of this.dealConfig.rules) {
      dealSpecificMetrics.totalRules++;
      const value = this.getFieldValue(data, rule.field);

      if (this.isDealRuleValid(value, rule)) {
        dealSpecificMetrics.passedRules++;
        this.incrementMetric(dealSpecificMetrics.byType, rule.constraints);
      } else {
        dealSpecificMetrics.failedRules++;
        const issue = this.createDealIssue(rule, value);
        issues.push(issue);

        const recommendation = this.createDealRecommendation(rule);
        recommendations.push(recommendation);
      }
    }

    // Calculate overall score
    const score = this.calculateScore(
      completenessOutput.score,
      accuracyOutput.score,
      consistencyOutput.score,
      timelinessOutput.score,
      dealSpecificMetrics
    );

    // Determine status
    const status = this.determineStatus(score);

    const result: DealAuditResult = {
      status,
      score,
      metrics: {
        completeness: completenessOutput.metrics,
        accuracy: accuracyOutput.metrics,
        consistency: consistencyOutput.metrics,
        timeliness: timelinessOutput.metrics,
        dealSpecific: dealSpecificMetrics,
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
    return dealAuditResultSchema.parse(result) as DealAuditResult;
  }

  private getFieldValue(data: unknown, field: string): unknown {
    if (typeof data !== 'object' || data === null) return undefined;
    return (data as Record<string, unknown>)[field];
  }

  private isDealRuleValid(value: unknown, rule: DealAuditConfig['rules'][number]): boolean {
    if (value === undefined) return false;

    const { constraints } = rule;
    if (!constraints) return true;

    if (constraints.dealAmount && typeof value === 'number') {
      return this.isValidDealAmount(value, constraints.dealAmount);
    }

    if (constraints.stage && typeof value === 'string') {
      return this.isValidStage(value, constraints.stage);
    }

    if (constraints.probability && typeof value === 'number') {
      return this.isValidProbability(value, constraints.probability);
    }

    if (constraints.closeDate && value instanceof Date) {
      return this.isValidCloseDate(value, constraints.closeDate);
    }

    if (constraints.customValidation) {
      return constraints.customValidation(value);
    }

    return true;
  }

  private isValidDealAmount(amount: number, constraints: NonNullable<DealAuditConfig['rules'][number]['constraints']>['dealAmount']): boolean {
    if (!constraints) return true;
    if (constraints.min !== undefined && amount < constraints.min) return false;
    if (constraints.max !== undefined && amount > constraints.max) return false;
    return true;
  }

  private isValidStage(stage: string, constraints: NonNullable<DealAuditConfig['rules'][number]['constraints']>['stage']): boolean {
    if (!constraints) return true;
    if (!constraints.allowedStages.includes(stage)) return false;
    if (constraints.requiredStages?.includes(stage)) return true;
    return true;
  }

  private isValidProbability(probability: number, constraints: NonNullable<DealAuditConfig['rules'][number]['constraints']>['probability']): boolean {
    if (!constraints) return true;
    if (constraints.min !== undefined && probability < constraints.min) return false;
    if (constraints.max !== undefined && probability > constraints.max) return false;
    if (constraints.required && probability === undefined) return false;
    return true;
  }

  private isValidCloseDate(date: Date, constraints: NonNullable<DealAuditConfig['rules'][number]['constraints']>['closeDate']): boolean {
    if (!constraints) return true;
    if (constraints.minDate && date < constraints.minDate) return false;
    if (constraints.maxDate && date > constraints.maxDate) return false;
    if (constraints.required && date === undefined) return false;
    return true;
  }

  private incrementMetric(
    metrics: DealAuditResult['metrics']['dealSpecific']['byType'],
    constraints?: DealAuditConfig['rules'][number]['constraints']
  ): void {
    if (!constraints) return;

    if (constraints.dealAmount) metrics.dealAmount.passed++;
    if (constraints.stage) metrics.stage.passed++;
    if (constraints.probability) metrics.probability.passed++;
    if (constraints.closeDate) metrics.closeDate.passed++;
  }

  private createDealIssue(
    rule: DealAuditConfig['rules'][number],
    value: unknown
  ): DealAuditResult['issues'][0] {
    const { field, constraints } = rule;
    let expected = '';
    const actual = String(value);
    let severity: 'low' | 'medium' | 'high' = 'medium';

    if (constraints?.dealAmount) {
      const { min, max, currency } = constraints.dealAmount;
      expected = `Deal amount between ${min ?? 0} and ${max ?? 'unlimited'} ${currency ?? 'USD'}`;
      severity = 'high';
    } else if (constraints?.stage) {
      expected = `Valid stage (${constraints.stage.allowedStages.join(', ')})`;
      severity = 'high';
    } else if (constraints?.probability) {
      const { min, max } = constraints.probability;
      expected = `Probability between ${min ?? 0} and ${max ?? 100}%`;
      severity = 'medium';
    } else if (constraints?.closeDate) {
      const { minDate, maxDate } = constraints.closeDate;
      expected = `Close date between ${minDate?.toISOString() ?? 'any'} and ${maxDate?.toISOString() ?? 'any'}`;
      severity = 'medium';
    }

    return {
      field,
      type: 'deal-specific',
      value,
      expected,
      actual,
      severity,
    };
  }

  private createDealRecommendation(
    rule: DealAuditConfig['rules'][number]
  ): DealAuditResult['recommendations'][0] {
    const { field, constraints } = rule;
    let message = '';
    let priority: 'low' | 'medium' | 'high' = 'medium';

    if (constraints?.dealAmount) {
      const { min, max, currency } = constraints.dealAmount;
      message = `Ensure ${field} is within the valid range (${min ?? 0} to ${max ?? 'unlimited'} ${currency ?? 'USD'})`;
      priority = 'high';
    } else if (constraints?.stage) {
      message = `Ensure ${field} is one of the allowed stages (${constraints.stage.allowedStages.join(', ')})`;
      priority = 'high';
    } else if (constraints?.probability) {
      const { min, max } = constraints.probability;
      message = `Ensure ${field} is within the valid probability range (${min ?? 0} to ${max ?? 100}%)`;
      priority = 'medium';
    } else if (constraints?.closeDate) {
      const { minDate, maxDate } = constraints.closeDate;
      message = `Ensure ${field} is within the valid date range (${minDate?.toISOString() ?? 'any'} to ${maxDate?.toISOString() ?? 'any'})`;
      priority = 'medium';
    }

    return {
      field,
      type: 'deal-specific',
      message,
      priority,
    };
  }

  private calculateScore(
    completenessScore: number,
    accuracyScore: number,
    consistencyScore: number,
    timelinessScore: number,
    dealSpecificMetrics: DealAuditResult['metrics']['dealSpecific']
  ): number {
    const dealSpecificScore =
      dealSpecificMetrics.totalRules > 0
        ? dealSpecificMetrics.passedRules / dealSpecificMetrics.totalRules
        : 1;

    const { thresholds } = this.dealConfig;
    const scores = [
      { score: completenessScore, threshold: thresholds.completeness },
      { score: accuracyScore, threshold: thresholds.accuracy },
      { score: consistencyScore, threshold: thresholds.consistency },
      { score: timelinessScore, threshold: thresholds.timeliness },
      { score: dealSpecificScore, threshold: thresholds.dealSpecific },
    ];

    return scores.reduce((sum, { score, threshold }) => {
      const weightedScore = score >= threshold ? score : score * (score / threshold);
      return sum + weightedScore;
    }, 0) / scores.length;
  }

  private determineStatus(score: number): DealAuditResult['status'] {
    if (score >= 0.95) return 'success';
    if (score >= 0.8) return 'warning';
    return 'error';
  }
} 