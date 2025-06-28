import { NextRequest, NextResponse } from 'next/server';

/**
 * i18nデバッグロガーミドルウェア
 */
export function i18nLogger(request: NextRequest, response: NextResponse) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const debugEnabled = process.env.NEXT_PUBLIC_I18N_DEBUG === 'true';

  if (isDevelopment || debugEnabled) {
    const pathname = request.nextUrl.pathname;
    const locale = pathname.split('/')[1];
    
    console.log('[i18n Middleware]', {
      pathname,
      locale,
      acceptLanguage: request.headers.get('accept-language'),
      savedLocale: request.cookies.get('NEXT_LOCALE')?.value,
      timestamp: new Date().toISOString()
    });

    // レスポンスヘッダーにデバッグ情報を追加
    response.headers.set('X-I18n-Locale', locale || 'unknown');
    response.headers.set('X-I18n-Pathname', pathname);
  }

  return response;
}

/**
 * 翻訳キーの使用状況をトラッキング
 */
const usedKeys = new Set<string>();
const missingKeys = new Set<string>();

export function trackTranslationKey(key: string, found: boolean, locale: string) {
  if (found) {
    usedKeys.add(`${locale}:${key}`);
  } else {
    missingKeys.add(`${locale}:${key}`);
    console.warn(`[i18n] Missing translation key: ${key} (${locale})`);
  }
}

export function getTranslationStats() {
  return {
    usedKeys: Array.from(usedKeys),
    missingKeys: Array.from(missingKeys),
    totalUsed: usedKeys.size,
    totalMissing: missingKeys.size
  };
}