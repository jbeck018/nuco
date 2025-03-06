import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
};

export default nextConfig;
