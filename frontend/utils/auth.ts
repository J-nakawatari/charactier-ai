/**
 * 認証ユーティリティ
 * JWT認証システム（Feature Flag対応）
 */

import { API_BASE_URL } from '@/lib/api-config';
import * as gtag from '@/lib/gtag';
import { getFeatureFlags } from './featureFlags';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  tokenBalance?: number;
  isSetupComplete?: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * 認証ヘッダーを取得（Feature Flag対応）
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  const flags = await getFeatureFlags();
  
  // CSRFトークンを追加
  if (typeof window !== 'undefined') {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];
    
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  // 従来方式の場合はAuthorizationヘッダーも追加
  if (!flags.SECURE_COOKIE_AUTH) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

/**
 * 同期版の認証ヘッダー取得（後方互換性のため）
 * 注意: Feature Flagを考慮しない
 */
export function getAuthHeadersSync(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  // CSRFトークンを追加
  if (typeof window !== 'undefined') {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];
    
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  // LocalStorageからアクセストークンを取得して追加
  const accessToken = getAccessToken();
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  return headers;
}

/**
 * 管理画面専用の認証ヘッダーを取得（HttpOnlyクッキー使用のため、Authorizationヘッダーは不要）
 */
export function getAdminAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  // CSRFトークンを追加
  if (typeof window !== 'undefined') {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];
    
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  return headers;
}

/**
 * 管理者用アクセストークンを取得
 */
export function getAdminAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminAccessToken');
}

/**
 * 管理者用アクセストークンを保存
 */
export function setAdminAccessToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('adminAccessToken', token);
  }
}

/**
 * 管理者用リフレッシュトークンを取得
 */
export function getAdminRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminRefreshToken');
}

/**
 * 管理者用リフレッシュトークンを保存
 */
export function setAdminRefreshToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('adminRefreshToken', token);
  }
}

/**
 * 管理者用トークンリフレッシュ
 */
export async function refreshAdminToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/admin/refresh`, {
      method: 'POST',
      credentials: 'include', // クッキーを送信
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      // HttpOnlyクッキーで新しいトークンが自動的に設定される
      return true;
    }
  } catch (error) {
    console.error('Admin token refresh failed:', error);
  }

  return false;
}

/**
 * 現在のユーザー情報を取得
 */
export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null; // SSRチェック
  
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return null;
    }
  }

  return null;
}

/**
 * ユーザー情報を保存
 */
export function setCurrentUser(user: AuthUser): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

/**
 * 認証状態をクリア
 */
export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
}

/**
 * アクセストークンを取得
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null; // SSRチェック
  return localStorage.getItem('accessToken');
}

/**
 * アクセストークンを保存
 */
export function setAccessToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', token);
  }
}

/**
 * リフレッシュトークンを取得
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null; // SSRチェック
  return localStorage.getItem('refreshToken');
}

/**
 * リフレッシュトークンを保存
 */
export function setRefreshToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('refreshToken', token);
  }
}

/**
 * 認証済みかどうかの判定（Feature Flag対応）
 */
export async function isAuthenticated(): Promise<boolean> {
  const flags = await getFeatureFlags();
  
  if (flags.SECURE_COOKIE_AUTH) {
    // HttpOnly Cookie方式: サーバーサイドで検証が必要
    // ここではユーザー情報の存在のみ確認
    const user = getCurrentUser();
    return !!user;
  } else {
    // 従来方式: LocalStorageのトークンとユーザー情報を確認
    const token = getAccessToken();
    const user = getCurrentUser();
    return !!(token && user);
  }
}

/**
 * 同期版の認証チェック（後方互換性のため）
 * 注意: Feature Flagを考慮しない簡易チェック
 */
export function isAuthenticatedSync(): boolean {
  const token = getAccessToken();
  const user = getCurrentUser();
  return !!(token && user);
}

/**
 * トークンリフレッシュ（HttpOnlyクッキー使用）
 */
export async function refreshToken(): Promise<{ success: boolean; error?: string }> {
  try {
    // 無限ループを防ぐため、リフレッシュ中フラグをチェック
    if ((window as any).__refreshing) {
      console.warn('[Auth] Refresh already in progress, skipping');
      return { success: false, error: 'Already refreshing' };
    }
    
    (window as any).__refreshing = true;
    console.log('[Auth] Starting token refresh...');
    
    const flags = await getFeatureFlags();
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    // CSRFトークンを追加
    if (typeof window !== 'undefined') {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
      
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }
    
    // 従来方式の場合はリフレッシュトークンをボディに含める
    const body = !flags.SECURE_COOKIE_AUTH && getRefreshToken() 
      ? JSON.stringify({ refreshToken: getRefreshToken() })
      : undefined;
    
    console.log('[Auth] Sending refresh request with flags:', { 
      SECURE_COOKIE_AUTH: flags.SECURE_COOKIE_AUTH,
      hasRefreshToken: !!getRefreshToken(),
      hasBody: !!body
    });
    
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // クッキーを送信
      headers,
      body
    });

    if (response.ok) {
      // 従来方式の場合はレスポンスからトークンを取得して保存
      if (!flags.SECURE_COOKIE_AUTH) {
        const data = await response.json();
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          console.log('[Auth] Token refresh successful (LocalStorage mode)');
        }
      } else {
        console.log('[Auth] Token refresh successful (Cookie mode)');
      }
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error('[Auth] Token refresh failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return { success: false, error: `Status ${response.status}: ${errorText}` };
    }
  } catch (error) {
    console.error('[Auth] Token refresh error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  } finally {
    (window as any).__refreshing = false;
  }
}

/**
 * ログアウト処理
 */
export function logout(): void {
  // Google Analytics: ユーザーIDをクリア（ログアウトイベントは自動送信される）
  gtag.setUserId(null);
  
  clearAuth();
  
  // ログインページにリダイレクト
  if (typeof window !== 'undefined') {
    // 現在のlocaleを取得してリダイレクト
    const currentPath = window.location.pathname;
    const localeMatch = currentPath.match(/^\/([a-z]{2})\//);
    const locale = localeMatch ? localeMatch[1] : 'ja';
    
    window.location.href = `/${locale}/login`;
  }
}

/**
 * 開発環境かどうかの判定
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 認証が必要なAPIリクエスト（Feature Flag対応）
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = await getAuthHeaders();
  
  // 相対URLの場合は API_BASE_URL を付加
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const response = await fetch(fullUrl, {
    ...options,
    credentials: 'include', // クッキーを送信
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  // 401の場合はトークンリフレッシュを試行
  if (response.status === 401) {
    // リフレッシュエンドポイントへのリクエストの場合はスキップ
    if (url.includes('/auth/refresh')) {
      logout();
      throw new Error('Refresh token is invalid');
    }
    
    const refreshResult = await refreshToken();
    if (refreshResult.success) {
      // リフレッシュ成功時は再リクエスト
      const newHeaders = await getAuthHeaders();
      return fetch(fullUrl, {
        ...options,
        credentials: 'include', // クッキーを送信
        headers: {
          ...newHeaders,
          ...options.headers,
        },
      });
    } else {
      // リフレッシュ失敗時はログアウト
      logout();
      throw new Error('Authentication failed');
    }
  }

  return response;
}

/**
 * 管理者認証が必要なAPIリクエスト
 */
export async function adminAuthenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = getAdminAuthHeaders();
  
  // 相対URLの場合は API_BASE_URL を付加
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const response = await fetch(fullUrl, {
    ...options,
    credentials: 'include', // クッキーを送信
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  // 401の場合は管理者トークンリフレッシュを試行
  if (response.status === 401) {
    const refreshed = await refreshAdminToken();
    if (refreshed) {
      // リフレッシュ成功時は再リクエスト
      const newHeaders = getAdminAuthHeaders();
      return fetch(fullUrl, {
        ...options,
        credentials: 'include', // クッキーを送信
        headers: {
          ...newHeaders,
          ...options.headers,
        },
      });
    } else {
      // リフレッシュ失敗時は管理者ログインページへ
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
      throw new Error('Admin authentication failed');
    }
  }

  return response;
}