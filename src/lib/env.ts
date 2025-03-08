/**
 * Environment variables helper
 * 
 * This file provides a type-safe way to access environment variables
 * that works in both Node.js and Edge Runtime environments.
 */

// Define the environment variables we need
export interface Env {
  // Application Configuration
  NEXT_PUBLIC_APP_URL: string;
  NODE_ENV: string;

  // NextAuth Configuration
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;

  // Database Configuration
  DATABASE_URL: string;

  // Iron Session Configuration
  IRON_SESSION_PASSWORD: string;

  // Upstash Redis Configuration
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;

  // Email Provider
  EMAIL_SERVER_HOST: string;
  EMAIL_SERVER_PORT: string;
  EMAIL_SERVER_USER: string;
  EMAIL_SERVER_PASSWORD: string;
  EMAIL_FROM: string;

  // OAuth Providers
  // Google
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;

  // Salesforce
  SALESFORCE_CLIENT_ID: string;
  SALESFORCE_CLIENT_SECRET: string;
  SALESFORCE_URL: string;

  // HubSpot
  HUBSPOT_CLIENT_ID: string;
  HUBSPOT_CLIENT_SECRET: string;

  // Slack
  SLACK_CLIENT_ID: string;
  SLACK_CLIENT_SECRET: string;
  SLACK_SIGNING_SECRET: string;

  // AI Providers
  // OpenAI
  OPENAI_API_KEY: string;

  // Anthropic
  ANTHROPIC_API_KEY: string;

  // Google AI
  GOOGLE_AI_API_KEY: string;

  // Vercel AI
  VERCEL_AI_API_KEY: string;

  // Payment Provider (Stripe)
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_ID_BASIC: string;
  STRIPE_PRICE_ID_PRO: string;
  STRIPE_PRICE_ID_ENTERPRISE: string;
  NEXT_PUBLIC_STRIPE_IS_TEST_MODE: string;

  // Feature Flags
  ENABLE_USAGE_TRACKING: string;
  ENABLE_PAYMENT_SYSTEM: string;
  ENABLE_EXTENSIONS: string;

  // Logging and Monitoring
  LOG_LEVEL: string;
  SENTRY_DSN: string;
}

// Get environment variables in a way that works in both Node.js and Edge Runtime
export function getEnv(): Env {
  return {
    // Application Configuration
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NODE_ENV: process.env.NODE_ENV || 'development',

    // NextAuth Configuration
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',

    // Database Configuration
    DATABASE_URL: process.env.DATABASE_URL || '',

    // Iron Session Configuration
    IRON_SESSION_PASSWORD: process.env.IRON_SESSION_PASSWORD || '',

    // Upstash Redis Configuration
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',

    // Email Provider
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST || '',
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT || '',
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER || '',
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD || '',
    EMAIL_FROM: process.env.EMAIL_FROM || '',

    // OAuth Providers
    // Google
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',

    // Salesforce
    SALESFORCE_CLIENT_ID: process.env.SALESFORCE_CLIENT_ID || '',
    SALESFORCE_CLIENT_SECRET: process.env.SALESFORCE_CLIENT_SECRET || '',
    SALESFORCE_URL: process.env.SALESFORCE_URL || '',

    // HubSpot
    HUBSPOT_CLIENT_ID: process.env.HUBSPOT_CLIENT_ID || '',
    HUBSPOT_CLIENT_SECRET: process.env.HUBSPOT_CLIENT_SECRET || '',

    // Slack
    SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || '',
    SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || '',
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || '',

    // AI Providers
    // OpenAI
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',

    // Anthropic
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',

    // Google AI
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || '',

    // Vercel AI
    VERCEL_AI_API_KEY: process.env.VERCEL_AI_API_KEY || '',

    // Payment Provider (Stripe)
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    STRIPE_PRICE_ID_BASIC: process.env.STRIPE_PRICE_ID_BASIC || '',
    STRIPE_PRICE_ID_PRO: process.env.STRIPE_PRICE_ID_PRO || '',
    STRIPE_PRICE_ID_ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
    NEXT_PUBLIC_STRIPE_IS_TEST_MODE: process.env.NEXT_PUBLIC_STRIPE_IS_TEST_MODE || 'true',

    // Feature Flags
    ENABLE_USAGE_TRACKING: process.env.ENABLE_USAGE_TRACKING || 'false',
    ENABLE_PAYMENT_SYSTEM: process.env.ENABLE_PAYMENT_SYSTEM || 'false',
    ENABLE_EXTENSIONS: process.env.ENABLE_EXTENSIONS || 'false',

    // Logging and Monitoring
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    SENTRY_DSN: process.env.SENTRY_DSN || '',
  };
}

// Validate that all required environment variables are present
export function validateEnv(): void {
  const env = getEnv();
  const missingVars: string[] = [];

  // Check critical environment variables
  if (!env.DATABASE_URL) missingVars.push('DATABASE_URL');
  if (!env.NEXTAUTH_SECRET) missingVars.push('NEXTAUTH_SECRET');
  if (!env.IRON_SESSION_PASSWORD) missingVars.push('IRON_SESSION_PASSWORD');

  // Throw an error if any required variables are missing
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
} 