export interface GoogleSearchAPIConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
}

export const defaultGoogleSearchConfig: GoogleSearchAPIConfig = {
  apiKey: process.env.SERPAPI_KEY || '',
  baseUrl: 'https://serpapi.com/search.json',
  timeout: 30000,
  maxRetries: 3,
}; 