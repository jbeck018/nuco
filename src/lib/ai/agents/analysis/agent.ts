import { BaseAgent, AgentConfig, AgentContext, AgentResult } from '../base';
import { AIServiceError } from '../../error';
import { db } from '@/lib/db';
import { agentExecutions } from '@/lib/db/schema/agents';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import {
  AnalysisConfig,
  AnalysisResult,
  AnalysisPipeline,
  AnalysisStage,
  analysisResultSchema,
  TextAnalysisConfig,
  NumericalAnalysisConfig,
  PatternRecognitionConfig,
  InsightGenerationConfig,
  Insight,
} from './types';
import { TextAnalyzer } from './analyzers/text';
import { InsightGenerator } from './generators/insight';
import { NumericalAnalyzer } from './analyzers/numerical';
import { PatternAnalyzer } from './analyzers/pattern';
import { AIService } from '../../service';

export interface AnalysisAgentConfig extends Omit<AgentConfig, 'aiService'> {
  analysis: AnalysisConfig;
  pipeline?: AnalysisPipeline;
  aiService: AIService;
}

export class AnalysisAgent extends BaseAgent {
  private textAnalyzer: TextAnalyzer;
  private numericalAnalyzer: NumericalAnalyzer;
  private patternAnalyzer: PatternAnalyzer;
  private insightGenerator: InsightGenerator;
  private pipeline!: AnalysisPipeline;

  constructor() {
    const config: AgentConfig = {
      id: 'analysis-agent',
      name: 'Analysis Agent',
      description: 'Agent for analyzing data and generating insights',
      model: 'gpt-4',
      aiService: new AIService(), // Will be overridden in initialize
    };
    super(config);
    this.textAnalyzer = new TextAnalyzer();
    this.numericalAnalyzer = new NumericalAnalyzer();
    this.patternAnalyzer = new PatternAnalyzer();
    this.insightGenerator = new InsightGenerator();
  }

  async initialize(config: AnalysisAgentConfig): Promise<void> {
    await super.initialize(config);

    // Ensure analysis configuration exists
    if (!config.analysis) {
      config.analysis = {
        textAnalysis: {
          enabled: true,
        },
      };
    }

    // Initialize analyzers with their respective configs
    if (config.analysis.textAnalysis?.enabled) {
      await this.textAnalyzer.initialize({
        ...config,
        textConfig: config.analysis.textAnalysis,
      });
    }
    if (config.analysis.numericalAnalysis?.enabled) {
      await this.numericalAnalyzer.initialize({
        ...config,
        numericalConfig: config.analysis.numericalAnalysis,
      });
    }
    if (config.analysis.patternRecognition?.enabled) {
      await this.patternAnalyzer.initialize({
        ...config,
        patternConfig: config.analysis.patternRecognition,
      });
    }
    if (config.analysis.insightGeneration?.enabled) {
      await this.insightGenerator.initialize({
        ...config,
        insightConfig: config.analysis.insightGeneration,
      });
    }

    // Set up analysis pipeline
    this.pipeline = config.pipeline || this.createDefaultPipeline(config.analysis);
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

      // Process data through pipeline
      const result = await this.processPipeline(context.metadata.data as unknown);

      // Update execution record
      await db
        .update(agentExecutions)
        .set({
          status: 'completed',
          output: result,
          completedAt: new Date(),
        })
        .where(eq(agentExecutions.id, executionId));

      return {
        success: true,
        output: result,
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
        error instanceof Error ? error.message : 'Failed to execute analysis',
        'custom',
        'analysis_error'
      );
    }
  }

  /**
   * Process data through the analysis pipeline
   */
  private async processPipeline(data: unknown): Promise<AnalysisResult> {
    const result: AnalysisResult = {
      summary: '',
      insights: [],
      metrics: {},
      metadata: {},
    };

    // Process each stage in the pipeline
    for (const stage of this.pipeline.stages) {
      if (!stage.enabled) continue;

      try {
        const stageResult = await this.processStage(stage, data);
        this.mergeStageResult(result, stageResult);
      } catch (error) {
        // Log stage error but continue with pipeline
        console.error(`Error processing stage ${stage.name}:`, error);
      }
    }

    // Ensure all insights have required fields
    const finalResult: AnalysisResult = {
      ...result,
      insights: result.insights.map(insight => {
        if (!insight.data) {
          throw new Error('Insight data is required');
        }
        return {
          type: insight.type,
          title: insight.title,
          description: insight.description,
          confidence: insight.confidence,
          data: insight.data,
          metadata: insight.metadata || {},
          recommendations: insight.recommendations || [],
        };
      }) as Insight[],
    };

    // Validate final result
    return analysisResultSchema.parse(finalResult) as AnalysisResult;
  }

  /**
   * Process a single pipeline stage
   */
  private async processStage(stage: AnalysisStage, data: unknown): Promise<Partial<AnalysisResult>> {
    let stageResult: Partial<AnalysisResult> = {
      insights: [] as Insight[],
      metrics: {},
      metadata: {},
    };
    
    switch (stage.type) {
      case 'text':
        stageResult = await this.textAnalyzer.analyze(data, stage.config as TextAnalysisConfig);
        break;
      case 'numerical':
        stageResult = await this.numericalAnalyzer.analyze(data, stage.config as NumericalAnalysisConfig);
        break;
      case 'pattern':
        stageResult = await this.patternAnalyzer.analyze(data, stage.config as PatternRecognitionConfig);
        break;
      case 'insight':
        stageResult = await this.insightGenerator.generate(data, stage.config as InsightGenerationConfig);
        break;
      default:
        throw new AIServiceError(
          `Unknown stage type: ${stage.type}`,
          'custom',
          'invalid_stage_type'
        );
    }

    // Ensure insights have required fields
    if (stageResult.insights) {
      stageResult.insights = stageResult.insights.map(insight => ({
        type: insight.type,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        data: insight.data ?? {},
        metadata: insight.metadata,
        recommendations: insight.recommendations,
      })) as Insight[];
    }

    return stageResult;
  }

  /**
   * Merge stage result into final result
   */
  private mergeStageResult(result: AnalysisResult, stageResult: Partial<AnalysisResult>): void {
    if (stageResult.summary) {
      result.summary = stageResult.summary;
    }
    if (stageResult.insights) {
      const validInsights = stageResult.insights.map(insight => ({
        type: insight.type,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        data: insight.data ?? {},
        metadata: insight.metadata,
        recommendations: insight.recommendations,
      })) as Insight[];
      result.insights.push(...validInsights);
    }
    if (stageResult.metrics) {
      Object.assign(result.metrics, stageResult.metrics);
    }
    if (stageResult.metadata) {
      Object.assign(result.metadata, stageResult.metadata);
    }
  }

  /**
   * Create default pipeline based on config
   */
  private createDefaultPipeline(config: AnalysisConfig): AnalysisPipeline {
    const stages: AnalysisStage[] = [];

    if (config.textAnalysis?.enabled) {
      stages.push({
        name: 'text_analysis',
        type: 'text',
        config: config.textAnalysis,
        enabled: true,
      });
    }

    if (config.numericalAnalysis?.enabled) {
      stages.push({
        name: 'numerical_analysis',
        type: 'numerical',
        config: config.numericalAnalysis,
        enabled: true,
      });
    }

    if (config.patternRecognition?.enabled) {
      stages.push({
        name: 'pattern_recognition',
        type: 'pattern',
        config: config.patternRecognition,
        enabled: true,
      });
    }

    if (config.insightGeneration?.enabled) {
      stages.push({
        name: 'insight_generation',
        type: 'insight',
        config: config.insightGeneration,
        enabled: true,
      });
    }

    return {
      stages,
      options: {
        parallel: true,
        batchSize: 100,
        timeout: 30000,
        retries: 3,
        cache: true,
        cacheTTL: 3600,
      },
    };
  }
} 