/**
 * Generic AI Error class 
 */
export class AIServiceError extends Error {
  public retryAfter?: number;
  public status?: number;
  public provider?: string;

  constructor(
    message: string,
    public code: string = 'ai_service_error',
    public type: string = 'custom',
    status?: number,
    provider?: string
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.status = status;
    this.provider = provider;
  }
} 