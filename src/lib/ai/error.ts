/**
 * AI Service Error
 * 
 * This file defines error types for the AI service.
 */
import { AIProvider } from './config';

/**
 * Generic AI Error class 
 */
export class AIServiceError extends Error {
  provider: AIProvider;
  status?: number;
  retryAfter?: number;
  type: string;

  constructor(message: string, provider: AIProvider, type: string = 'unknown', status?: number) {
    super(message);
    this.name = 'AIServiceError';
    this.provider = provider;
    this.status = status;
    this.type = type;
  }
} 