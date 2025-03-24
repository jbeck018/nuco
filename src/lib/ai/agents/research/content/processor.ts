import * as cheerio from 'cheerio';
import { AIServiceError } from '@/lib/ai/error';

export interface ProcessedContent {
  title: string;
  description: string;
  mainContent: string;
  metadata: {
    author?: string;
    publishedDate?: string;
    keywords?: string[];
    readingTime?: number;
    wordCount?: number;
  };
}

export class ContentProcessor {
  private readonly $: cheerio.CheerioAPI;

  constructor(html: string) {
    this.$ = cheerio.load(html);
  }

  async process(): Promise<ProcessedContent> {
    try {
      // Remove unwanted elements
      this.removeUnwantedElements();

      // Extract content
      const title = this.extractTitle();
      const description = this.extractDescription();
      const mainContent = this.extractMainContent();
      const metadata = await this.extractMetadata();

      // Calculate reading metrics
      const wordCount = this.calculateWordCount(mainContent);
      const readingTime = this.calculateReadingTime(wordCount);

      return {
        title,
        description,
        mainContent,
        metadata: {
          ...metadata,
          wordCount,
          readingTime,
        },
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new AIServiceError(`Failed to process content: ${err.message}`);
    }
  }

  private removeUnwantedElements(): void {
    // Remove script tags
    this.$('script').remove();
    // Remove style tags
    this.$('style').remove();
    // Remove comments
    this.$('*').contents().each((_, element) => {
      if (element.type === 'comment') {
        this.$(element).remove();
      }
    });
    // Remove navigation elements
    this.$('nav, header, footer, .nav, .header, .footer, #nav, #header, #footer').remove();
    // Remove social media elements
    this.$('.social-share, .social-media, .share-buttons').remove();
    // Remove ads
    this.$('.ad, .advertisement, .ads, [class*="ad-"], [id*="ad-"]').remove();
  }

  private extractTitle(): string {
    // Try meta title first
    const metaTitle = this.$('meta[property="og:title"]').attr('content') ||
                     this.$('meta[name="twitter:title"]').attr('content');
    if (metaTitle) return metaTitle;

    // Fall back to h1
    const h1Title = this.$('h1').first().text().trim();
    if (h1Title) return h1Title;

    // Finally, try document title
    return this.$('title').text().trim();
  }

  private extractDescription(): string {
    // Try meta description first
    const metaDesc = this.$('meta[name="description"]').attr('content') ||
                    this.$('meta[property="og:description"]').attr('content') ||
                    this.$('meta[name="twitter:description"]').attr('content');
    if (metaDesc) return metaDesc;

    // Fall back to first paragraph
    return this.$('p').first().text().trim();
  }

  private extractMainContent(): string {
    // Try to find the main content area
    const mainContent = this.$('article, main, .content, .post-content, .article-content, #content, #main-content')
      .first();

    if (mainContent.length) {
      return this.cleanText(mainContent.text());
    }

    // Fall back to body content
    return this.cleanText(this.$('body').text());
  }

  private async extractMetadata(): Promise<ProcessedContent['metadata']> {
    const metadata: ProcessedContent['metadata'] = {};

    // Extract author
    const author = this.$('meta[name="author"]').attr('content') ||
                  this.$('meta[property="article:author"]').attr('content') ||
                  this.$('.author, .byline').first().text().trim();
    if (author) metadata.author = author;

    // Extract published date
    const publishedDate = this.$('meta[property="article:published_time"]').attr('content') ||
                         this.$('meta[name="published-date"]').attr('content') ||
                         this.$('time[datetime]').first().attr('datetime');
    if (publishedDate) metadata.publishedDate = publishedDate;

    // Extract keywords
    const keywords = this.$('meta[name="keywords"]').attr('content')?.split(',').map((k: string) => k.trim());
    if (keywords?.length) metadata.keywords = keywords;

    return metadata;
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .trim();
  }

  private calculateWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private calculateReadingTime(wordCount: number): number {
    // Assuming average reading speed of 200 words per minute
    return Math.ceil(wordCount / 200);
  }
} 