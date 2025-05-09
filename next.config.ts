import type { NextConfig } from 'next';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = withPWA({
  output: 'standalone',
  publicRuntimeConfig: {
    BACKEND_URL: process.env.BACKEND_URL,
  },
  env: {
    BACKEND_URL: process.env.BACKEND_URL,
  },
  pageExtensions: ['ts', 'tsx'],
});

export default nextConfig;
