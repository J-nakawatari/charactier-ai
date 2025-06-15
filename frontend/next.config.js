const withNextIntl = require('next-intl/plugin')('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      // 本番環境の画像ドメイン
      ...(process.env.NEXT_PUBLIC_IMAGE_DOMAIN ? [process.env.NEXT_PUBLIC_IMAGE_DOMAIN] : []),
    ].filter(Boolean),
  },
  async rewrites() {
    // 本番環境対応: 環境変数からバックエンドURLを取得
    const isProduction = process.env.NODE_ENV === 'production';
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                      (isProduction ? 'https://api.charactier-ai.com' : 'http://localhost:5000');
    
    console.log('🔗 Backend URL:', backendUrl);
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);