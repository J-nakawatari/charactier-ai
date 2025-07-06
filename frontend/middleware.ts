import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales } from './i18n';

const intlMiddleware = createMiddleware({
  // サポートする言語
  locales,
  
  // デフォルトの言語
  defaultLocale: 'ja',
  
  // ロケール検出を無効にする（ユーザー選択を優先）
  localeDetection: false,
  
  // 常にロケールプレフィックスを付ける
  localePrefix: 'always'
});

export default function middleware(request: NextRequest) {
  // ユーザーが設定した言語をクッキーから取得
  const savedLocale = request.cookies.get('NEXT_LOCALE')?.value;
  
  // URLから現在のロケールを取得
  const pathname = request.nextUrl.pathname;
  const currentLocale = pathname.split('/')[1];
  
  // ルートパス（/）の場合の処理
  if (pathname === '/') {
    const redirectLocale = savedLocale && locales.includes(savedLocale as any) 
      ? savedLocale 
      : 'ja';
    
    const url = request.nextUrl.clone();
    url.pathname = `/${redirectLocale}`;
    return NextResponse.redirect(url);
  }
  
  // 保存された言語と現在のURLの言語が異なる場合、リダイレクトしない
  // これにより、ユーザーが意図的に言語を変更した場合を尊重する
  
  const response = intlMiddleware(request);
  
  // レスポンスにロケールクッキーを設定
  if (response && locales.includes(currentLocale as any)) {
    response.cookies.set('NEXT_LOCALE', currentLocale, {
      maxAge: 365 * 24 * 60 * 60, // 1年間
      path: '/',
      sameSite: 'lax'
    });
  }
  
  return response;
}

export const config = {
  // next-intlのミドルウェアを適用するパス
  // 管理画面(/admin)とAPI(/api)は除外する
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',

    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix  
    '/(ja|en)/:path*',

    // Enable redirects that add missing locales, but exclude API routes, admin routes, and webhook
    '/((?!_next|_vercel|api|admin|webhook|.*\\..*).*)'
  ]
};