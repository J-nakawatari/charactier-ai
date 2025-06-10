import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n';

export default createMiddleware({
  // サポートする言語
  locales,
  
  // デフォルトの言語
  defaultLocale: 'ja',
  
  // ロケール検出を有効にする
  localeDetection: true
});

export const config = {
  // next-intlのミドルウェアを適用するパス
  // 管理画面(/admin)とAPI(/api)は除外する
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',

    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix  
    '/(ja|en)/:path*',

    // Enable redirects that add missing locales, but exclude API routes and admin routes
    '/((?!_next|_vercel|api|admin|.*\\..*).*)'
  ]
};