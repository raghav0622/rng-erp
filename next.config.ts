import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* Config options here */
  reactStrictMode: true,
  poweredByHeader: false, // 🛡️ Hide that we are using Next.js

  // 🖼️ IMAGE OPTIMIZATION
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/*/o/**',
      },
    ],
  },

  // ⚡ COMPILER OPTIMIZATIONS
  experimental: {
    optimizePackageImports: ['@mantine/core', '@tabler/icons-react'],
    // serverActions: false, // We explicitly disabled Server Actions earlier
  },
  turbopack: {
    resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  // 🔒 SECURITY HEADERS
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Prevents Clickjacking
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet, noimageindex',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
