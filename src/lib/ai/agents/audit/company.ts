import { BaseAgent, AgentConfig, AgentContext, AgentResult, AgentState } from '../base';
import { AIServiceError } from '../../error';
import { 
  CompanyAuditConfig, 
  CompanyAuditResult, 
  companyAuditResultSchema,
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

export class CompanyAuditor extends BaseAgent {
  private companyConfig: CompanyAuditConfig = {
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
      companySpecific: 0.95,
    },
  };

  private completenessAuditor: CompletenessAuditor;
  private accuracyAuditor: AccuracyAuditor;
  private consistencyAuditor: ConsistencyAuditor;
  private timelinessAuditor: TimelinessAuditor;

  constructor() {
    const config: AgentConfig = {
      enabled: false,
      name: 'company-auditor',
      description: 'Audits company data quality',
      id: 'company-auditor',
      model: 'gpt-4',
      aiService: new AIService(), // Will be overridden in initialize
    };
    super(config);

    this.completenessAuditor = new CompletenessAuditor();
    this.accuracyAuditor = new AccuracyAuditor();
    this.consistencyAuditor = new ConsistencyAuditor();
    this.timelinessAuditor = new TimelinessAuditor();
  }

  async initialize(config: AgentConfig & { companyConfig: CompanyAuditConfig }): Promise<void> {
    await super.initialize(config);
    this.companyConfig = config.companyConfig;

    // Initialize sub-auditors
    await this.completenessAuditor.initialize({
      ...config,
      completenessConfig: this.companyConfig.completeness,
    });
    await this.accuracyAuditor.initialize({
      ...config,
      accuracyConfig: this.companyConfig.accuracy,
    });
    await this.consistencyAuditor.initialize({
      ...config,
      consistencyConfig: this.companyConfig.consistency,
    });
    await this.timelinessAuditor.initialize({
      ...config,
      timelinessConfig: this.companyConfig.timeliness,
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

      throw new AIServiceError('Company audit failed');
    }
  }

  private async audit(data: unknown): Promise<CompanyAuditResult> {
    const startTime = Date.now();
    const issues: CompanyAuditResult['issues'] = [];
    const recommendations: CompanyAuditResult['recommendations'] = [];

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
    const processedIssues: CompanyAuditResult['issues'] = [
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

    // Run company-specific rules
    const companySpecificMetrics = {
      totalRules: 0,
      passedRules: 0,
      failedRules: 0,
      byType: {
        companyNameFormat: { total: 0, passed: 0, failed: 0 },
        industryCodeFormat: { total: 0, passed: 0, failed: 0 },
        sizeRange: { total: 0, passed: 0, failed: 0 },
        websiteFormat: { total: 0, passed: 0, failed: 0 },
      },
    };

    for (const rule of this.companyConfig.rules) {
      companySpecificMetrics.totalRules++;
      const value = this.getFieldValue(data, rule.field);

      if (this.isCompanyRuleValid(value, rule)) {
        companySpecificMetrics.passedRules++;
        this.incrementMetric(companySpecificMetrics.byType, rule.constraints);
      } else {
        companySpecificMetrics.failedRules++;
        const issue = this.createCompanyIssue(rule, value);
        issues.push(issue);

        const recommendation = this.createCompanyRecommendation(rule);
        recommendations.push(recommendation);
      }
    }

    // Calculate overall score
    const score = this.calculateScore(
      completenessOutput.score,
      accuracyOutput.score,
      consistencyOutput.score,
      timelinessOutput.score,
      companySpecificMetrics
    );

    // Determine status
    const status = this.determineStatus(score);

    const result: CompanyAuditResult = {
      status,
      score,
      metrics: {
        completeness: completenessOutput.metrics,
        accuracy: accuracyOutput.metrics,
        consistency: consistencyOutput.metrics,
        timeliness: timelinessOutput.metrics,
        companySpecific: companySpecificMetrics,
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
    return companyAuditResultSchema.parse(result) as CompanyAuditResult;
  }

  private getFieldValue(data: unknown, field: string): unknown {
    if (typeof data !== 'object' || data === null) return undefined;
    return (data as Record<string, unknown>)[field];
  }

  private isCompanyRuleValid(value: unknown, rule: CompanyAuditConfig['rules'][number]): boolean {
    if (value === undefined) return false;

    const { constraints } = rule;
    if (!constraints) return true;

    if (constraints.companyNameFormat && typeof value === 'string') {
      return this.isValidCompanyName(value);
    }

    if (constraints.industryCodeFormat && typeof value === 'string') {
      return this.isValidIndustryCode(value);
    }

    if (constraints.sizeRange && typeof value === 'number') {
      return this.isValidSizeRange(value, constraints.sizeRange);
    }

    if (constraints.websiteFormat && typeof value === 'string') {
      return this.isValidWebsite(value);
    }

    if (constraints.customValidation) {
      return constraints.customValidation(value);
    }

    return true;
  }

  private isValidCompanyName(name: string): boolean {
    return name.length >= 2 && /^[a-zA-Z0-9\s&.,'-]+$/.test(name);
  }

  private isValidIndustryCode(code: string): boolean {
    return /^[A-Z0-9]{2,4}$/.test(code);
  }

  private isValidSizeRange(size: number, range: { min?: number; max?: number }): boolean {
    if (range.min !== undefined && size < range.min) return false;
    if (range.max !== undefined && size > range.max) return false;
    return true;
  }

  private isValidWebsite(website: string): boolean {
    try {
      new URL(website);
      return true;
    } catch {
      return false;
    }
  }

  private incrementMetric(
    metrics: CompanyAuditResult['metrics']['companySpecific']['byType'],
    constraints?: CompanyAuditConfig['rules'][number]['constraints']
  ): void {
    if (!constraints) return;

    if (constraints.companyNameFormat) metrics.companyNameFormat.passed++;
    if (constraints.industryCodeFormat) metrics.industryCodeFormat.passed++;
    if (constraints.sizeRange) metrics.sizeRange.passed++;
    if (constraints.websiteFormat) metrics.websiteFormat.passed++;
  }

  private createCompanyIssue(
    rule: CompanyAuditConfig['rules'][number],
    value: unknown
  ): CompanyAuditResult['issues'][0] {
    const { field, constraints } = rule;
    let expected = '';
    const actual = String(value);
    let severity: 'low' | 'medium' | 'high' = 'medium';

    if (constraints?.companyNameFormat) {
      expected = 'Valid company name (2+ characters, alphanumeric)';
      severity = 'high';
    } else if (constraints?.industryCodeFormat) {
      expected = 'Valid industry code (2-4 characters, uppercase)';
      severity = 'medium';
    } else if (constraints?.sizeRange) {
      const { min, max } = constraints.sizeRange;
      expected = `Company size between ${min ?? 0} and ${max ?? 'unlimited'}`;
      severity = 'medium';
    } else if (constraints?.websiteFormat) {
      expected = 'Valid website URL';
      severity = 'low';
    }

    return {
      field,
      type: 'company-specific',
      value,
      expected,
      actual,
      severity,
    };
  }

  private createCompanyRecommendation(
    rule: CompanyAuditConfig['rules'][number]
  ): CompanyAuditResult['recommendations'][0] {
    const { field, constraints } = rule;
    let message = '';
    let priority: 'low' | 'medium' | 'high' = 'medium';

    if (constraints?.companyNameFormat) {
      message = `Ensure ${field} is a valid company name (2+ characters, alphanumeric)`;
      priority = 'high';
    } else if (constraints?.industryCodeFormat) {
      message = `Ensure ${field} is a valid industry code (2-4 characters, uppercase)`;
      priority = 'medium';
    } else if (constraints?.sizeRange) {
      const { min, max } = constraints.sizeRange;
      message = `Ensure ${field} is within the valid range (${min ?? 0} to ${max ?? 'unlimited'})`;
      priority = 'medium';
    } else if (constraints?.websiteFormat) {
      message = `Ensure ${field} is a valid website URL`;
      priority = 'low';
    }

    return {
      field,
      type: 'company-specific',
      message,
      priority,
    };
  }

  private calculateScore(
    completenessScore: number,
    accuracyScore: number,
    consistencyScore: number,
    timelinessScore: number,
    companySpecificMetrics: CompanyAuditResult['metrics']['companySpecific']
  ): number {
    const companySpecificScore =
      companySpecificMetrics.totalRules > 0
        ? companySpecificMetrics.passedRules / companySpecificMetrics.totalRules
        : 1;

    const { thresholds } = this.companyConfig;
    const scores = [
      { score: completenessScore, threshold: thresholds.completeness },
      { score: accuracyScore, threshold: thresholds.accuracy },
      { score: consistencyScore, threshold: thresholds.consistency },
      { score: timelinessScore, threshold: thresholds.timeliness },
      { score: companySpecificScore, threshold: thresholds.companySpecific },
    ];

    return scores.reduce((sum, { score, threshold }) => {
      const weightedScore = score >= threshold ? score : score * (score / threshold);
      return sum + weightedScore;
    }, 0) / scores.length;
  }

  private determineStatus(score: number): CompanyAuditResult['status'] {
    if (score >= 0.95) return 'success';
    if (score >= 0.8) return 'warning';
    return 'error';
  }
} 