import { z } from 'zod';

// Analysis result types
export interface AnalysisResult {
  summary: string;
  insights: Insight[];
  metrics: Record<string, number>;
  metadata: Record<string, unknown>;
}

export interface Insight {
  type: InsightType;
  title: string;
  description: string;
  confidence: number;
  data: unknown;
  recommendations?: string[];
  metadata?: Record<string, unknown>;
}

export enum InsightType {
  Trend = 'trend',
  Anomaly = 'anomaly',
  Correlation = 'correlation',
  Pattern = 'pattern',
  Prediction = 'prediction',
  Recommendation = 'recommendation',
}

// Analysis configuration types
export interface AnalysisConfig {
  textAnalysis?: TextAnalysisConfig;
  numericalAnalysis?: NumericalAnalysisConfig;
  patternRecognition?: PatternRecognitionConfig;
  insightGeneration?: InsightGenerationConfig;
}

export interface TextAnalysisConfig {
  enabled: boolean;
  summarization?: {
    maxLength: number;
    preserveKeyPoints: boolean;
    style?: 'concise' | 'detailed' | 'technical' | 'casual';
    format?: 'paragraph' | 'bullet' | 'structured';
    includeKeyPoints?: boolean;
    focus?: 'all' | 'main' | 'technical' | 'business' | 'custom';
    customFocus?: string;
  };
  sentiment?: {
    enabled: boolean;
    granularity: 'document' | 'sentence' | 'aspect';
  };
  topics?: {
    enabled: boolean;
    maxTopics: number;
    minConfidence: number;
  };
  entities?: {
    enabled: boolean;
    types: string[];
  };
}

export interface NumericalAnalysisConfig {
  enabled: boolean;
  aggregation?: {
    functions: ('mean' | 'median' | 'mode' | 'std' | 'min' | 'max')[];
    groupBy?: string[];
  };
  correlation?: {
    enabled: boolean;
    methods: ('pearson' | 'spearman' | 'kendall')[];
    minConfidence: number;
  };
  forecasting?: {
    enabled: boolean;
    horizon: number;
    methods: ('linear' | 'exponential' | 'seasonal')[];
  };
}

export interface PatternRecognitionConfig {
  enabled: boolean;
  sequence?: {
    enabled: boolean;
    minLength: number;
    maxLength: number;
  };
  anomaly?: {
    enabled: boolean;
    methods: ('statistical' | 'isolation' | 'density')[];
    threshold: number;
  };
  clustering?: {
    enabled: boolean;
    algorithm: 'kmeans' | 'dbscan' | 'hierarchical';
    maxClusters: number;
  };
}

export interface InsightGenerationConfig {
  enabled: boolean;
  maxInsights: number;
  minConfidence: number;
  types: InsightType[];
  recommendations?: {
    enabled: boolean;
    maxCount: number;
    minConfidence: number;
  };
}

// Analysis pipeline types
export interface AnalysisPipeline {
  stages: AnalysisStage[];
  options: AnalysisOptions;
}

export interface AnalysisStage {
  name: string;
  type: 'text' | 'numerical' | 'pattern' | 'insight';
  config: unknown;
  enabled: boolean;
}

export interface AnalysisOptions {
  parallel: boolean;
  batchSize: number;
  timeout: number;
  retries: number;
  cache: boolean;
  cacheTTL: number;
}

// Analysis result schemas
export const insightSchema = z.object({
  type: z.nativeEnum(InsightType),
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  data: z.unknown(),
  recommendations: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const analysisResultSchema = z.object({
  summary: z.string(),
  insights: z.array(insightSchema),
  metrics: z.record(z.number()),
  metadata: z.record(z.unknown()),
}); 