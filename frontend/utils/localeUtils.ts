'use client';

export type SupportedLocale = 'ja' | 'en';

/**
 * ブラウザの言語設定を取得する
 */
export function getBrowserLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'ja';
  
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('en')) return 'en';
  return 'ja';
}

/**
 * 保存された言語設定を取得する（優先順序: localStorage > cookie > browser > default）
 */
export function getSavedLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'ja';
  
  // 1. LocalStorageから取得
  const localStorageLocale = localStorage.getItem('user-locale');
  if (localStorageLocale === 'ja' || localStorageLocale === 'en') {
    return localStorageLocale;
  }
  
  // 2. Cookieから取得
  const cookieLocale = document.cookie
    .split('; ')
    .find(row => row.startsWith('NEXT_LOCALE='))
    ?.split('=')[1];
  if (cookieLocale === 'ja' || cookieLocale === 'en') {
    return cookieLocale;
  }
  
  // 3. ブラウザ設定を確認
  return getBrowserLocale();
}

/**
 * 言語設定を保存する
 */
export function saveLocale(locale: SupportedLocale): void {
  if (typeof window === 'undefined') return;
  
  // LocalStorageに保存
  localStorage.setItem('user-locale', locale);
  
  // Cookieに保存
  const maxAge = 365 * 24 * 60 * 60; // 1年
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * URLから現在のロケールを取得する
 */
export function getLocaleFromPath(pathname: string): SupportedLocale {
  const segments = pathname.split('/');
  const pathLocale = segments[1];
  
  if (pathLocale === 'ja' || pathLocale === 'en') {
    return pathLocale;
  }
  
  return 'ja';
}

/**
 * パスの言語部分を新しい言語に置き換える
 */
export function replaceLocaleInPath(pathname: string, newLocale: SupportedLocale): string {
  const segments = pathname.split('/');
  const currentLocale = segments[1];
  
  if (currentLocale === 'ja' || currentLocale === 'en') {
    segments[1] = newLocale;
    return segments.join('/');
  }
  
  // ロケールがない場合は先頭に追加
  return `/${newLocale}${pathname}`;
}

/**
 * 言語変更を実行する（設定保存 + ページ遷移）
 */
export function changeLanguage(newLocale: SupportedLocale, currentPath?: string): void {
  if (typeof window === 'undefined') return;
  
  // 設定を保存
  saveLocale(newLocale);
  
  // 現在のパスを取得
  const pathname = currentPath || window.location.pathname;
  const newPath = replaceLocaleInPath(pathname, newLocale);
  
  // Validate the new path to prevent XSS
  const sanitizedPath = newPath.replace(/[<>'"]/g, '');
  if (sanitizedPath !== newPath) {
    console.error('Invalid path detected');
    return;
  }
  
  // Ensure the path is relative (starts with /)
  if (!sanitizedPath.startsWith('/')) {
    console.error('Path must be relative');
    return;
  }
  
  // ページ遷移（フルリロードで確実に言語変更を適用）
  window.location.href = sanitizedPath;
}