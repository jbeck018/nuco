# Cloudflare Pages Deployment Guide

This guide explains how to deploy the Nuco application to Cloudflare Pages.

## Prerequisites

- Cloudflare account
- Wrangler CLI installed (`bun add -D wrangler`)
- Node.js v20.x

## Deployment Steps

1. **Build the application**:
   ```bash
   bun run build
   ```

2. **Copy static assets**:
   ```bash
   cp -r public .next/standalone/
   cp -r .next/static .next/standalone/.next/
   ```

3. **Deploy to Cloudflare Pages**:
   ```bash
   bun run deploy
   ```

## Configuration Files

### wrangler.toml
```toml
[pages]
compatibility_date = "2024-03-07"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".next/standalone"

[build]
command = "bun run build"
output_directory = ".next/standalone"

[site]
bucket = ".next/standalone"

[env.production]
name = "nuco-production"
route = ""

[env.preview]
name = "nuco-preview"
```

### next.config.ts
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Optimize for Cloudflare Pages deployment
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during production builds
    ignoreBuildErrors: true,
  },
  // ... other configuration options
};

export default nextConfig;
```

## Environment Variables

Make sure to set up the required environment variables in the Cloudflare Pages dashboard:

1. Go to your Cloudflare Pages project
2. Navigate to Settings > Environment variables
3. Add all the necessary environment variables from your `.env` file

## Custom Domain Setup

To set up a custom domain:

1. Go to your Cloudflare Pages project
2. Navigate to Custom domains
3. Click "Set up a custom domain"
4. Follow the instructions to add your domain

## Troubleshooting

- **File size limits**: Cloudflare Pages has a 25MB file size limit per file
- **Build errors**: If you encounter build errors, try disabling TypeScript and ESLint checks in the next.config.ts file
- **API routes**: Make sure your API routes are compatible with Cloudflare Pages

## Deployment URLs

- Main deployment URL: https://990cd598.nuco-5ub.pages.dev
- Branch deployment URL: https://cloudfare.nuco-5ub.pages.dev 