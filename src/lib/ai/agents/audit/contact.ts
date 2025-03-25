import { BaseAgent, AgentConfig, AgentContext, AgentResult, AgentState } from '../base';
import { AIServiceError } from '../../error';
import { 
  ContactAuditConfig, 
  ContactAuditResult, 
  contactAuditResultSchema,
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

export class ContactAuditor extends BaseAgent {
  private contactConfig: ContactAuditConfig = {
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
      contactSpecific: 0.95,
    },
  };

  private completenessAuditor: CompletenessAuditor;
  private accuracyAuditor: AccuracyAuditor;
  private consistencyAuditor: ConsistencyAuditor;
  private timelinessAuditor: TimelinessAuditor;

  constructor() {
    const config: AgentConfig = {
      enabled: false,
      name: 'contact-auditor',
      description: 'Audits contact data quality',
      id: 'contact-auditor',
      model: 'gpt-4',
      aiService: new AIService(), // Will be overridden in initialize
    };
    super(config);

    this.completenessAuditor = new CompletenessAuditor();
    this.accuracyAuditor = new AccuracyAuditor();
    this.consistencyAuditor = new ConsistencyAuditor();
    this.timelinessAuditor = new TimelinessAuditor();
  }

  async initialize(config: AgentConfig & { contactConfig: ContactAuditConfig }): Promise<void> {
    await super.initialize(config);
    this.contactConfig = config.contactConfig;

    // Initialize sub-auditors
    await this.completenessAuditor.initialize({
      ...config,
      completenessConfig: this.contactConfig.completeness,
    });
    await this.accuracyAuditor.initialize({
      ...config,
      accuracyConfig: this.contactConfig.accuracy,
    });
    await this.consistencyAuditor.initialize({
      ...config,
      consistencyConfig: this.contactConfig.consistency,
    });
    await this.timelinessAuditor.initialize({
      ...config,
      timelinessConfig: this.contactConfig.timeliness,
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

      throw new AIServiceError('Contact audit failed');
    }
  }

  private async audit(data: unknown): Promise<ContactAuditResult> {
    const startTime = Date.now();
    const issues: ContactAuditResult['issues'] = [];
    const recommendations: ContactAuditResult['recommendations'] = [];

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
    const processedIssues: ContactAuditResult['issues'] = [
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

    // Run contact-specific rules
    const contactSpecificMetrics = {
      totalRules: 0,
      passedRules: 0,
      failedRules: 0,
      byType: {
        emailFormat: { total: 0, passed: 0, failed: 0 },
        phoneFormat: { total: 0, passed: 0, failed: 0 },
        nameFormat: { total: 0, passed: 0, failed: 0 },
        addressFormat: { total: 0, passed: 0, failed: 0 },
      },
    };

    for (const rule of this.contactConfig.rules) {
      contactSpecificMetrics.totalRules++;
      const value = this.getFieldValue(data, rule.field);

      if (this.isContactRuleValid(value, rule)) {
        contactSpecificMetrics.passedRules++;
        this.incrementMetric(contactSpecificMetrics.byType, rule.constraints);
      } else {
        contactSpecificMetrics.failedRules++;
        const issue = this.createContactIssue(rule, value);
        issues.push(issue);

        const recommendation = this.createContactRecommendation(rule);
        recommendations.push(recommendation);
      }
    }

    // Calculate overall score
    const score = this.calculateScore(
      completenessOutput.score,
      accuracyOutput.score,
      consistencyOutput.score,
      timelinessOutput.score,
      contactSpecificMetrics
    );

    // Determine status
    const status = this.determineStatus(score);

    const result: ContactAuditResult = {
      status,
      score,
      metrics: {
        completeness: completenessOutput.metrics,
        accuracy: accuracyOutput.metrics,
        consistency: consistencyOutput.metrics,
        timeliness: timelinessOutput.metrics,
        contactSpecific: contactSpecificMetrics,
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
    return contactAuditResultSchema.parse(result) as ContactAuditResult;
  }

  private getFieldValue(data: unknown, field: string): unknown {
    if (typeof data !== 'object' || data === null) return undefined;
    return (data as Record<string, unknown>)[field];
  }

  private isContactRuleValid(value: unknown, rule: ContactAuditConfig['rules'][number]): boolean {
    if (value === undefined) return false;

    const { constraints } = rule;
    if (!constraints) return true;

    if (constraints.emailFormat && typeof value === 'string') {
      return this.isValidEmail(value);
    }

    if (constraints.phoneFormat && typeof value === 'string') {
      return this.isValidPhone(value);
    }

    if (constraints.nameFormat && typeof value === 'string') {
      return this.isValidName(value);
    }

    if (constraints.addressFormat && typeof value === 'string') {
      return this.isValidAddress(value);
    }

    if (constraints.customValidation) {
      return constraints.customValidation(value);
    }

    return true;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  private isValidName(name: string): boolean {
    return name.length >= 2 && /^[a-zA-Z\s-']+$/.test(name);
  }

  private isValidAddress(address: string): boolean {
    return address.length >= 5 && /^[a-zA-Z0-9\s,.-]+$/.test(address);
  }

  private incrementMetric(
    metrics: ContactAuditResult['metrics']['contactSpecific']['byType'],
    constraints?: ContactAuditConfig['rules'][number]['constraints']
  ): void {
    if (!constraints) return;

    if (constraints.emailFormat) metrics.emailFormat.passed++;
    if (constraints.phoneFormat) metrics.phoneFormat.passed++;
    if (constraints.nameFormat) metrics.nameFormat.passed++;
    if (constraints.addressFormat) metrics.addressFormat.passed++;
  }

  private createContactIssue(
    rule: ContactAuditConfig['rules'][number],
    value: unknown
  ): ContactAuditResult['issues'][0] {
    const { field, constraints } = rule;
    let expected = '';
    const actual = String(value);
    let severity: 'low' | 'medium' | 'high' = 'medium';

    if (constraints?.emailFormat) {
      expected = 'Valid email address';
      severity = 'high';
    } else if (constraints?.phoneFormat) {
      expected = 'Valid phone number';
      severity = 'medium';
    } else if (constraints?.nameFormat) {
      expected = 'Valid name (2+ characters, letters only)';
      severity = 'medium';
    } else if (constraints?.addressFormat) {
      expected = 'Valid address (5+ characters, alphanumeric)';
      severity = 'low';
    }

    return {
      field,
      type: 'contact-specific',
      value,
      expected,
      actual,
      severity,
    };
  }

  private createContactRecommendation(
    rule: ContactAuditConfig['rules'][number]
  ): ContactAuditResult['recommendations'][0] {
    const { field, constraints } = rule;
    let message = '';
    let priority: 'low' | 'medium' | 'high' = 'medium';

    if (constraints?.emailFormat) {
      message = `Ensure ${field} is a valid email address`;
      priority = 'high';
    } else if (constraints?.phoneFormat) {
      message = `Ensure ${field} is a valid phone number`;
      priority = 'medium';
    } else if (constraints?.nameFormat) {
      message = `Ensure ${field} is a valid name (2+ characters, letters only)`;
      priority = 'medium';
    } else if (constraints?.addressFormat) {
      message = `Ensure ${field} is a valid address (5+ characters, alphanumeric)`;
      priority = 'low';
    }

    return {
      field,
      type: 'contact-specific',
      message,
      priority,
    };
  }

  private calculateScore(
    completenessScore: number,
    accuracyScore: number,
    consistencyScore: number,
    timelinessScore: number,
    contactSpecificMetrics: ContactAuditResult['metrics']['contactSpecific']
  ): number {
    const contactSpecificScore =
      contactSpecificMetrics.totalRules > 0
        ? contactSpecificMetrics.passedRules / contactSpecificMetrics.totalRules
        : 1;

    const { thresholds } = this.contactConfig;
    const scores = [
      { score: completenessScore, threshold: thresholds.completeness },
      { score: accuracyScore, threshold: thresholds.accuracy },
      { score: consistencyScore, threshold: thresholds.consistency },
      { score: timelinessScore, threshold: thresholds.timeliness },
      { score: contactSpecificScore, threshold: thresholds.contactSpecific },
    ];

    return scores.reduce((sum, { score, threshold }) => {
      const weightedScore = score >= threshold ? score : score * (score / threshold);
      return sum + weightedScore;
    }, 0) / scores.length;
  }

  private determineStatus(score: number): ContactAuditResult['status'] {
    if (score >= 0.95) return 'success';
    if (score >= 0.8) return 'warning';
    return 'error';
  }
} 