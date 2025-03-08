import type { NextConfig } from "next";
import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // Optimize for Cloudflare Pages deployment
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Enable serverActions optimization
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // External packages for server components
  serverExternalPackages: [
    'pg', 
    'pgvector', 
    'drizzle-orm',
    '@trpc/server',
  ],
  // Optimize image loading
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Optimize for production builds
  productionBrowserSourceMaps: false,
  // Optimize for React Server Components
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Configure environment variables for Edge Runtime
  env: {
    // Application Configuration
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,

    // NextAuth Configuration
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,

    // Database Configuration
    DATABASE_URL: process.env.DATABASE_URL,

    // Iron Session Configuration
    IRON_SESSION_PASSWORD: process.env.IRON_SESSION_PASSWORD,

    // Upstash Redis Configuration
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

    // Email Provider
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
    EMAIL_FROM: process.env.EMAIL_FROM,

    // OAuth Providers
    // Google
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    // Salesforce
    SALESFORCE_CLIENT_ID: process.env.SALESFORCE_CLIENT_ID,
    SALESFORCE_CLIENT_SECRET: process.env.SALESFORCE_CLIENT_SECRET,
    SALESFORCE_URL: process.env.SALESFORCE_URL,

    // HubSpot
    HUBSPOT_CLIENT_ID: process.env.HUBSPOT_CLIENT_ID,
    HUBSPOT_CLIENT_SECRET: process.env.HUBSPOT_CLIENT_SECRET,

    // Slack
    SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID,
    SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,

    // AI Providers
    // OpenAI
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,

    // Anthropic
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,

    // Google AI
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,

    // Vercel AI
    VERCEL_AI_API_KEY: process.env.VERCEL_AI_API_KEY,

    // Payment Provider (Stripe)
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID_BASIC: process.env.STRIPE_PRICE_ID_BASIC,
    STRIPE_PRICE_ID_PRO: process.env.STRIPE_PRICE_ID_PRO,
    STRIPE_PRICE_ID_ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    NEXT_PUBLIC_STRIPE_IS_TEST_MODE: process.env.NEXT_PUBLIC_STRIPE_IS_TEST_MODE,

    // Feature Flags
    ENABLE_USAGE_TRACKING: process.env.ENABLE_USAGE_TRACKING,
    ENABLE_PAYMENT_SYSTEM: process.env.ENABLE_PAYMENT_SYSTEM,
    ENABLE_EXTENSIONS: process.env.ENABLE_EXTENSIONS,

    // Logging and Monitoring
    LOG_LEVEL: process.env.LOG_LEVEL,
    SENTRY_DSN: process.env.SENTRY_DSN,
  },
  // Configure polyfills for Edge Runtime
  webpack: (config, { isServer, nextRuntime }) => {
    // Only apply these polyfills for Edge Runtime
    if (isServer && nextRuntime === 'edge') {
      // Polyfill Node.js modules for Edge Runtime
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        path: false,
        fs: false,
        os: false,
        util: false,
      };
    }
    return config;
  },
};

if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform();
}

export default nextConfig;
