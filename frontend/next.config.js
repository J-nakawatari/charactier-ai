const withNextIntl = require('next-intl/plugin')('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Next.js Image最適化を無効化（unoptimizedを使用）
    unoptimized: true,
    domains: [
      'localhost',
      'charactier-ai.com',
      // 本番環境の画像ドメイン
      ...(process.env.NEXT_PUBLIC_IMAGE_DOMAIN ? [process.env.NEXT_PUBLIC_IMAGE_DOMAIN] : []),
    ].filter(Boolean),
    // アップロードされた画像のパスパターンを許可
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'charactier-ai.com',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/uploads/**',
      },
    ],
  },
  async rewrites() {
    // 本番環境対応: 環境変数からバックエンドURLを取得
    const isProduction = process.env.NODE_ENV === 'production';
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                      (isProduction ? 'https://charactier-ai.com' : 'http://localhost:5000');
    
    console.log('🔗 Backend URL:', backendUrl);
    
    return [
      // フロントエンドAPIルートを優先（Next.js API routes）
      {
        source: '/api/user/profile',
        destination: '/api/user/profile', // Next.js API route を使用
      },
      {
        source: '/api/user/dashboard',
        destination: '/api/user/dashboard', // Next.js API route を使用
      },
      // その他のAPIはバックエンドにプロキシ
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