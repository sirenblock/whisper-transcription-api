/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Environment variables exposed to the browser
  env: {
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.whisperapi.com',
    DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://app.whisperapi.com',
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/signup',
        destination: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://app.whisperapi.com/signup',
        permanent: false,
      },
      {
        source: '/login',
        destination: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://app.whisperapi.com/login',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
