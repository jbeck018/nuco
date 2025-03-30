import { AIServiceError } from '@/lib/ai/error';
import { ResearchResult } from '../google';
import { ProcessedContent } from '../content/processor';

export interface AnalysisResult {
  relevanceScore: number;
  credibilityScore: number;
  summary: string;
  keyPoints: string[];
  metadata: {
    domainAuthority: number;
    freshness: number;
    contentQuality: number;
  };
}

export class ResultAnalyzer {
  private readonly model: string;
  private readonly aiService: any; // Replace with actual AI service type

  constructor(model: string, aiService: any) {
    this.model = model;
    this.aiService = aiService;
  }

  async analyzeResult(result: ResearchResult, processedContent: ProcessedContent): Promise<AnalysisResult> {
    try {
      const [relevanceScore, credibilityScore] = await Promise.all([
        this.calculateRelevanceScore(result, processedContent),
        this.calculateCredibilityScore(result, processedContent)
      ]);

      const summary = await this.generateSummary(processedContent);
      const keyPoints = await this.extractKeyPoints(processedContent);
      const metadata = await this.calculateMetadata(result, processedContent);

      return {
        relevanceScore,
        credibilityScore,
        summary,
        keyPoints,
        metadata
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new AIServiceError(`Failed to analyze result: ${err.message}`);
    }
  }

  private async calculateRelevanceScore(result: ResearchResult, content: ProcessedContent): Promise<number> {
    // Use AI to analyze relevance based on title, description, and content
    const prompt = `Analyze the relevance of this content to the search query "${result.query}":
      Title: ${content.title}
      Description: ${content.description}
      Content: ${content.mainContent.substring(0, 1000)} // First 1000 chars for efficiency
      
      Provide a relevance score between 0 and 1, where:
      - 1.0: Perfectly relevant
      - 0.7-0.9: Highly relevant
      - 0.4-0.6: Moderately relevant
      - 0.1-0.3: Slightly relevant
      - 0.0: Not relevant`;

    const response = await this.aiService.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 10
    });

    const score = parseFloat(response.choices[0].message.content);
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
  }

  private async calculateCredibilityScore(result: ResearchResult, content: ProcessedContent): Promise<number> {
    // Analyze source credibility based on multiple factors
    const factors = await Promise.all([
      this.analyzeDomainAuthority(result.url),
      this.analyzeContentQuality(content),
      this.analyzeSourceFreshness(content.metadata.publishedDate)
    ]);

    // Weighted average of factors
    return factors.reduce((sum, score, index) => sum + score * [0.4, 0.4, 0.2][index], 0);
  }

  private async analyzeDomainAuthority(url: string): Promise<number> {
    // Extract domain from URL
    const domain = new URL(url).hostname;
    
    // Use AI to analyze domain authority
    const prompt = `Analyze the domain authority of ${domain}:
      Consider factors like:
      - Domain age
      - Site popularity
      - Content quality
      - Backlink profile
      
      Provide a score between 0 and 1.`;

    const response = await this.aiService.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 10
    });

    const score = parseFloat(response.choices[0].message.content);
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
  }

  private async analyzeContentQuality(content: ProcessedContent): Promise<number> {
    const prompt = `Analyze the quality of this content:
      Title: ${content.title}
      Description: ${content.description}
      Content: ${content.mainContent.substring(0, 1000)}
      
      Consider:
      - Writing quality
      - Information accuracy
      - Source citations
      - Professional tone
      
      Provide a score between 0 and 1.`;

    const response = await this.aiService.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 10
    });

    const score = parseFloat(response.choices[0].message.content);
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
  }

  private async analyzeSourceFreshness(publishedDate?: string): Promise<number> {
    if (!publishedDate) return 0.5;

    const published = new Date(publishedDate);
    const now = new Date();
    const ageInDays = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24);

    // Score decreases as content ages
    if (ageInDays <= 7) return 1.0;
    if (ageInDays <= 30) return 0.8;
    if (ageInDays <= 90) return 0.6;
    if (ageInDays <= 365) return 0.4;
    return 0.2;
  }

  private async generateSummary(content: ProcessedContent): Promise<string> {
    const prompt = `Generate a concise summary of this content:
      Title: ${content.title}
      Description: ${content.description}
      Content: ${content.mainContent.substring(0, 2000)}
      
      Provide a clear, well-structured summary that captures the main points.`;

    const response = await this.aiService.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200
    });

    return response.choices[0].message.content.trim();
  }

  private async extractKeyPoints(content: ProcessedContent): Promise<string[]> {
    const prompt = `Extract 3-5 key points from this content:
      Title: ${content.title}
      Description: ${content.description}
      Content: ${content.mainContent.substring(0, 2000)}
      
      Provide only the key points, one per line.`;

    const response = await this.aiService.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 150
    });

    return response.choices[0].message.content
      .split('\n')
      .map((point: string) => point.trim())
      .filter((point: string) => point.length > 0);
  }

  private async calculateMetadata(result: ResearchResult, content: ProcessedContent): Promise<AnalysisResult['metadata']> {
    const domainAuthority = await this.analyzeDomainAuthority(result.url);
    const contentQuality = await this.analyzeContentQuality(content);
    const freshness = await this.analyzeSourceFreshness(content.metadata.publishedDate);

    return {
      domainAuthority,
      contentQuality,
      freshness
    };
  }
} 