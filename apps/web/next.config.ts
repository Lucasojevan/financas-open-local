import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:3001'}/:path*` }];
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data: https://cdn.pluggy.ai https://*.pluggy.ai; style-src 'self' 'unsafe-inline' https://cdn.pluggy.ai; script-src 'self' 'unsafe-inline' https://cdn.pluggy.ai https://*.pluggy.ai; connect-src 'self' https://api.pluggy.ai https://*.pluggy.ai; frame-src https://*.pluggy.ai; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://*.pluggy.ai" },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'X-DNS-Prefetch-Control', value: 'off' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' }
      ]
    }];
  }
};

export default nextConfig;
