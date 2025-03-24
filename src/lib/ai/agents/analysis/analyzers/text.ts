import { TextAnalysisConfig, AnalysisResult, InsightType } from '../types';
import { AIServiceError } from '../../../error';
import { BaseAgent, AgentConfig, AgentContext, AgentResult } from '../../base';
import { Message } from '../../../service';
import { AIService } from '../../../service';

export class TextAnalyzer extends BaseAgent {
  private textConfig: TextAnalysisConfig;

  constructor() {
    const config: AgentConfig = {
      id: 'text-analyzer',
      name: 'Text Analyzer',
      description: 'Agent for analyzing text data',
      model: 'gpt-4',
      aiService: new AIService(), // Will be overridden in initialize
    };
    super(config);
    this.textConfig = {
      enabled: false,
    };
  }

  async initialize(config: AgentConfig & { textConfig?: TextAnalysisConfig }): Promise<void> {
    await super.initialize(config);
    if (config.textConfig) {
      this.textConfig = config.textConfig;
    }
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const data = context.metadata.data as unknown;
      const results = await this.analyze(data, this.textConfig);

      return {
        success: true,
        output: results,
        metadata: {
          ...context.metadata,
          textAnalysis: {
            status: 'completed',
            timestamp: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      await this.handleError(error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: context.metadata,
      };
    }
  }

  async analyze(data: unknown, config: TextAnalysisConfig): Promise<Partial<AnalysisResult>> {
    try {
      const text = this.extractText(data);
      if (!text) {
        return {
          insights: [],
          metrics: {},
          metadata: {
            textAnalysis: {
              status: 'skipped',
              reason: 'no_text_data',
            },
          },
        };
      }

      const results: Partial<AnalysisResult> = {
        insights: [],
        metrics: {},
        metadata: {
          textAnalysis: {
            status: 'completed',
            timestamp: new Date().toISOString(),
          },
        },
      };

      // Perform text summarization if enabled
      if (config.summarization) {
        const summary = await this.generateSummary(text, config.summarization);
        results.summary = summary.text;
        
        // Add summary metrics
        if (results.metrics) {
          results.metrics.summaryLength = summary.text.length;
          results.metrics.compressionRatio = summary.metadata.compressionRatio;
          results.metrics.readabilityScore = summary.metadata.readabilityScore;
          results.metrics.topicCoverage = summary.metadata.topicCoverage;
        }

        // Add summary insights
        if (results.insights) {
          // Add main summary insight
          results.insights.push({
            type: InsightType.Trend,
            title: 'Text Summary',
            description: `Generated a ${summary.text.length} character summary with ${summary.keyPoints.length} key points`,
            confidence: summary.confidence,
            data: {
              originalLength: text.length,
              compressionRatio: summary.metadata.compressionRatio,
              readabilityScore: summary.metadata.readabilityScore,
              topicCoverage: summary.metadata.topicCoverage,
            },
          });

          // Add readability insight if score is low
          if (summary.metadata.readabilityScore < 60) {
            results.insights.push({
              type: InsightType.Recommendation,
              title: 'Readability Improvement',
              description: 'The summary could be more readable. Consider simplifying the language and structure.',
              confidence: 0.8,
              data: {
                currentScore: summary.metadata.readabilityScore,
                targetScore: 70,
              },
              recommendations: [
                'Use simpler sentence structures',
                'Break down complex ideas into smaller parts',
                'Add more examples or explanations',
              ],
            });
          }

          // Add topic coverage insight if coverage is low
          if (summary.metadata.topicCoverage < 0.7) {
            results.insights.push({
              type: InsightType.Recommendation,
              title: 'Topic Coverage',
              description: 'Some important topics from the original text are not fully covered in the summary.',
              confidence: 0.8,
              data: {
                coverage: summary.metadata.topicCoverage,
                targetCoverage: 0.8,
              },
              recommendations: [
                'Include more details about key topics',
                'Add missing context or background information',
                'Expand on important subtopics',
              ],
            });
          }

          // Add key points insight
          if (summary.keyPoints.length > 0) {
            results.insights.push({
              type: InsightType.Trend,
              title: 'Key Points',
              description: `Identified ${summary.keyPoints.length} key points from the text`,
              confidence: 0.9,
              data: {
                keyPoints: summary.keyPoints,
              },
            });
          }
        }
      }

      // Perform sentiment analysis if enabled
      if (config.sentiment?.enabled) {
        const sentiment = await this.analyzeSentiment(text, config.sentiment);
        if (results.metrics) {
          results.metrics.sentiment = sentiment.score;
        }
        if (results.insights) {
          results.insights.push({
            type: InsightType.Trend,
            title: 'Sentiment Analysis',
            description: `Overall sentiment: ${sentiment.label}`,
            confidence: sentiment.confidence,
            data: {
              score: sentiment.score,
              label: sentiment.label,
            },
          });
        }
      }

      // Extract entities if enabled
      if (config.entities?.enabled) {
        const entities = await this.extractEntities(text, config.entities);
        if (results.metrics) {
          results.metrics.entities = entities.length;
        }
        if (results.insights) {
          results.insights.push({
            type: InsightType.Trend,
            title: 'Entity Extraction',
            description: `Found ${entities.length} entities`,
            confidence: 0.9,
            data: {
              entities,
            },
            metadata: {
              entities,
            },
          });
        }
      }

      // Perform topic modeling if enabled
      if (config.topics?.enabled) {
        const topics = await this.modelTopics(text, config.topics);
        if (results.metrics) {
          results.metrics.topics = topics.length;
        }
        if (results.insights) {
          results.insights.push({
            type: InsightType.Trend,
            title: 'Topic Analysis',
            description: `Identified ${topics.length} main topics`,
            confidence: 0.85,
            data: {
              topics,
            },
            metadata: {
              topics,
            },
          });
        }
      }

      return results;
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Failed to analyze text',
        'custom',
        'text_analysis_error'
      );
    }
  }

  private extractText(data: unknown): string | null {
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) {
      return data
        .map(item => this.extractText(item))
        .filter(Boolean)
        .join('\n');
    }
    if (typeof data === 'object' && data !== null) {
      return Object.values(data)
        .map(value => this.extractText(value))
        .filter(Boolean)
        .join('\n');
    }
    return null;
  }

  private async analyzeSentiment(
    text: string,
    config: TextAnalysisConfig['sentiment']
  ): Promise<{ score: number; label: string; confidence: number }> {
    const prompt = `Analyze the sentiment of the following text and provide a score between -1 and 1, where -1 is very negative and 1 is very positive. Also provide a confidence score between 0 and 1.

Text: ${text}

Format your response as JSON with the following structure:
{
  "score": number,
  "label": string,
  "confidence": number
}`;

    const message: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      createdAt: new Date(),
    };

    const response = await this.generateCompletion(
      [message],
      {
        temperature: 0.3,
      }
    );

    try {
      let content = '';
      const stream = response as unknown as AsyncIterable<string>;
      for await (const chunk of stream) {
        content += chunk;
      }
      return JSON.parse(content);
    } catch (error) {
      throw new AIServiceError(
        'Failed to parse sentiment analysis result',
        'custom',
        'sentiment_parsing_error'
      );
    }
  }

  private async extractEntities(
    text: string,
    config: TextAnalysisConfig['entities']
  ): Promise<Array<{ text: string; type: string; confidence: number }>> {
    const prompt = `Extract named entities from the following text. Identify people, organizations, locations, dates, and other relevant entities.

Text: ${text}

Format your response as JSON with the following structure:
{
  "entities": [
    {
      "text": string,
      "type": string,
      "confidence": number
    }
  ]
}`;

    const message: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      createdAt: new Date(),
    };

    const response = await this.generateCompletion(
      [message],
      {
        temperature: 0.3,
      }
    );

    try {
      let content = '';
      const stream = response as unknown as AsyncIterable<string>;
      for await (const chunk of stream) {
        content += chunk;
      }
      const result = JSON.parse(content);
      return result.entities;
    } catch (error) {
      throw new AIServiceError(
        'Failed to parse entity extraction result',
        'custom',
        'entity_parsing_error'
      );
    }
  }

  private async modelTopics(
    text: string,
    config: TextAnalysisConfig['topics']
  ): Promise<Array<{ topic: string; keywords: string[]; confidence: number }>> {
    const prompt = `Identify the main topics and their associated keywords in the following text.

Text: ${text}

Format your response as JSON with the following structure:
{
  "topics": [
    {
      "topic": string,
      "keywords": string[],
      "confidence": number
    }
  ]
}`;

    const message: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      createdAt: new Date(),
    };

    const response = await this.generateCompletion(
      [message],
      {
        temperature: 0.3,
      }
    );

    try {
      let content = '';
      const stream = response as unknown as AsyncIterable<string>;
      for await (const chunk of stream) {
        content += chunk;
      }
      const result = JSON.parse(content);
      return result.topics;
    } catch (error) {
      throw new AIServiceError(
        'Failed to parse topic modeling result',
        'custom',
        'topic_parsing_error'
      );
    }
  }

  private async generateSummary(
    text: string,
    config: TextAnalysisConfig['summarization']
  ): Promise<{
    text: string;
    confidence: number;
    keyPoints: string[];
    metadata: {
      originalLength: number;
      summaryLength: number;
      compressionRatio: number;
      readabilityScore: number;
      topicCoverage: number;
      sentimentScore?: number;
      entityCount?: number;
      topicCount?: number;
    };
  }> {
    if (!config) {
      throw new AIServiceError(
        'Summarization config is required',
        'custom',
        'summarization_config_error'
      );
    }

    // Generate initial summary
    const prompt = `Generate a comprehensive summary of the following text. Focus on key points, main ideas, and important details.

Text: ${text}

Requirements:
- Length: ${config.maxLength} characters maximum
- Style: ${config.style || 'concise'}
- Format: ${config.format || 'paragraph'}
- Include key points: ${config.includeKeyPoints ? 'yes' : 'no'}
- Focus on: ${config.focus || 'all aspects'}
${config.customFocus ? `- Custom focus: ${config.customFocus}` : ''}

Format your response as JSON with the following structure:
{
  "summary": string,
  "confidence": number,
  "keyPoints": string[],
  "metadata": {
    "originalLength": number,
    "summaryLength": number,
    "compressionRatio": number,
    "readabilityScore": number,
    "topicCoverage": number
  }
}`;

    const message: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      createdAt: new Date(),
    };

    const response = await this.generateCompletion(
      [message],
      {
        temperature: 0.3,
      }
    );

    try {
      let content = '';
      const stream = response as unknown as AsyncIterable<string>;
      for await (const chunk of stream) {
        content += chunk;
      }
      const result = JSON.parse(content);

      // Perform additional analysis if enabled
      const metadata = { ...result.metadata };

      // Add sentiment score if sentiment analysis is enabled
      if (this.textConfig.sentiment?.enabled) {
        const sentiment = await this.analyzeSentiment(result.summary, this.textConfig.sentiment);
        metadata.sentimentScore = sentiment.score;
      }

      // Add entity count if entity extraction is enabled
      if (this.textConfig.entities?.enabled) {
        const entities = await this.extractEntities(result.summary, this.textConfig.entities);
        metadata.entityCount = entities.length;
      }

      // Add topic count if topic modeling is enabled
      if (this.textConfig.topics?.enabled) {
        const topics = await this.modelTopics(result.summary, this.textConfig.topics);
        metadata.topicCount = topics.length;
      }

      return {
        text: result.summary,
        confidence: result.confidence,
        keyPoints: result.keyPoints,
        metadata,
      };
    } catch (error) {
      throw new AIServiceError(
        'Failed to parse summarization result',
        'custom',
        'summarization_parsing_error'
      );
    }
  }

  private async analyzeReadability(
    text: string
  ): Promise<{
    score: number;
    level: string;
    metrics: {
      sentenceComplexity: number;
      wordComplexity: number;
      paragraphStructure: number;
    };
  }> {
    const prompt = `Analyze the readability of the following text. Provide a score between 0 and 100, where higher scores indicate better readability.

Text: ${text}

Format your response as JSON with the following structure:
{
  "score": number,
  "level": string,
  "metrics": {
    "sentenceComplexity": number,
    "wordComplexity": number,
    "paragraphStructure": number
  }
}`;

    const message: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      createdAt: new Date(),
    };

    const response = await this.generateCompletion(
      [message],
      {
        temperature: 0.3,
      }
    );

    try {
      let content = '';
      const stream = response as unknown as AsyncIterable<string>;
      for await (const chunk of stream) {
        content += chunk;
      }
      return JSON.parse(content);
    } catch (error) {
      throw new AIServiceError(
        'Failed to parse readability analysis result',
        'custom',
        'readability_analysis_error'
      );
    }
  }

  private async analyzeTopicCoverage(
    originalText: string,
    summary: string
  ): Promise<{
    coverage: number;
    missingTopics: string[];
    keyTopics: string[];
  }> {
    const prompt = `Analyze the topic coverage between the original text and its summary. Identify key topics and any missing information.

Original Text: ${originalText}
Summary: ${summary}

Format your response as JSON with the following structure:
{
  "coverage": number,
  "missingTopics": string[],
  "keyTopics": string[]
}`;

    const message: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      createdAt: new Date(),
    };

    const response = await this.generateCompletion(
      [message],
      {
        temperature: 0.3,
      }
    );

    try {
      let content = '';
      const stream = response as unknown as AsyncIterable<string>;
      for await (const chunk of stream) {
        content += chunk;
      }
      return JSON.parse(content);
    } catch (error) {
      throw new AIServiceError(
        'Failed to parse topic coverage analysis result',
        'custom',
        'topic_coverage_error'
      );
    }
  }
} 