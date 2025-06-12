const withNextIntl = require('next-intl/plugin')('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3004/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:3004/uploads/:path*',
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);