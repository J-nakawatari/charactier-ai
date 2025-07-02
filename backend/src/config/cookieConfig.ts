/**
 * Cookie設定の最適化
 * Nginxヘッダーサイズエラーを防ぐための設定
 */

import { CookieOptions } from 'express';

// Cookie名の定義
export const COOKIE_NAMES = {
  USER_ACCESS: 'userAccessToken',
  USER_REFRESH: 'userRefreshToken',
  ADMIN_ACCESS: 'adminAccessToken',
  ADMIN_REFRESH: 'adminRefreshToken',
  CSRF_TOKEN: 'XSRF-TOKEN',
  // 古いCookie名（削除対象）
  LEGACY_ACCESS: 'accessToken',
  LEGACY_REFRESH: 'refreshToken'
} as const;

// Cookie設定の共通オプション
const getBaseCookieOptions = (isProduction: boolean): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  domain: process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined)
});

// アクセストークン用Cookie設定（短時間）
export const getAccessTokenCookieOptions = (isProduction: boolean = process.env.NODE_ENV === 'production'): CookieOptions => ({
  ...getBaseCookieOptions(isProduction),
  maxAge: 2 * 60 * 60 * 1000 + 10 * 60 * 1000, // 2時間10分（トークン2時間＋更新バッファ10分）
});

// リフレッシュトークン用Cookie設定
export const getRefreshTokenCookieOptions = (isProduction: boolean = process.env.NODE_ENV === 'production'): CookieOptions => ({
  ...getBaseCookieOptions(isProduction),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
  httpOnly: true, // 必須
});

// CSRFトークン用Cookie設定
export const getCsrfTokenCookieOptions = (isProduction: boolean = process.env.NODE_ENV === 'production'): CookieOptions => ({
  ...getBaseCookieOptions(isProduction),
  httpOnly: false, // JavaScriptから読めるように
  maxAge: 24 * 60 * 60 * 1000, // 24時間
});

// Cookie削除用オプション
export const getCookieClearOptions = (isProduction: boolean = process.env.NODE_ENV === 'production'): CookieOptions => ({
  path: '/',
  domain: process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined)
});

// すべての認証関連Cookieをクリア
export const clearAllAuthCookies = (res: any): void => {
  const clearOptions = getCookieClearOptions();
  
  // 現在のCookie
  Object.values(COOKIE_NAMES).forEach(cookieName => {
    res.clearCookie(cookieName, clearOptions);
  });
  
  // 追加の古いCookie（念のため）
  const additionalCookies = [
    'jwt', 'token', 'auth', 'session',
    'adminToken', 'userToken'
  ];
  
  additionalCookies.forEach(cookieName => {
    res.clearCookie(cookieName, clearOptions);
  });
};

// ユーザー認証関連Cookieのみクリア
export const clearUserAuthCookies = (res: any): void => {
  const clearOptions = getCookieClearOptions();
  
  // ユーザーCookieのみクリア
  res.clearCookie(COOKIE_NAMES.USER_ACCESS, clearOptions);
  res.clearCookie(COOKIE_NAMES.USER_REFRESH, clearOptions);
  
  // 古いCookie（互換性のため）
  res.clearCookie(COOKIE_NAMES.LEGACY_ACCESS, clearOptions);
  res.clearCookie(COOKIE_NAMES.LEGACY_REFRESH, clearOptions);
};

// 管理者認証関連Cookieのみクリア
export const clearAdminAuthCookies = (res: any): void => {
  const clearOptions = getCookieClearOptions();
  
  // 管理者Cookieのみクリア
  res.clearCookie(COOKIE_NAMES.ADMIN_ACCESS, clearOptions);
  res.clearCookie(COOKIE_NAMES.ADMIN_REFRESH, clearOptions);
};

// Cookie合計サイズの推定
export const estimateCookieSize = (cookies: Record<string, string>): number => {
  let totalSize = 0;
  
  for (const [name, value] of Object.entries(cookies)) {
    // Cookie形式: name=value; 
    totalSize += name.length + 1 + (value?.length || 0) + 2;
  }
  
  return totalSize;
};

// Cookieサイズの警告閾値（Nginxデフォルト8KBの80%）
export const COOKIE_SIZE_WARNING_THRESHOLD = 6 * 1024; // 6KB
export const COOKIE_SIZE_ERROR_THRESHOLD = 7.5 * 1024; // 7.5KB