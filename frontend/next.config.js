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
      // Next.js 15 RC のバグ回避: /sitemap.xml を /sitemap にリライト
      {
        source: '/sitemap.xml',
        destination: '/sitemap',
      },
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
  async headers() {
    return [
      {
        // Apply security headers to all routes
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
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(self), usb=()'
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none'
          },
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'production'
              ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https: https://www.google-analytics.com; connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://api.openai.com https://www.google-analytics.com https://www.googletagmanager.com wss: https://charactier-ai.com https://staging.charactier-ai.com; frame-src 'self' https://js.stripe.com https://checkout.stripe.com; object-src 'none'; media-src 'self' blob: data:; child-src 'self'; form-action 'self'; upgrade-insecure-requests; block-all-mixed-content"
              : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https: http://localhost:* https://www.google-analytics.com; connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://api.openai.com https://www.google-analytics.com https://www.googletagmanager.com wss: ws: http://localhost:*; frame-src 'self' https://js.stripe.com https://checkout.stripe.com; object-src 'none'; media-src 'self' blob: data:; child-src 'self'; form-action 'self'"
          }
        ]
      }
    ];
  },
};

module.exports = withNextIntl(nextConfig);