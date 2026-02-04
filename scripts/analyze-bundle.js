#!/usr/bin/env node
/**
 * Bundle analysis script - helps identify large dependencies
 * Run with: npm run analyze
 * or: ANALYZE=true npm run build
 */

const path = require('path');

// Check if ANALYZE env variable is set
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  });

  const nextConfig = require('./next.config.ts');
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  module.exports = require('./next.config.ts');
}
