import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
    serverActions: {
      // Allow Server Actions to be called from any origin in development
      allowedOrigins: process.env.NODE_ENV === 'development' ? ['*'] : [],
    },
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  // Allow cross-origin requests during development
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  // Ensure API routes are properly handled
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

export default nextConfig;
