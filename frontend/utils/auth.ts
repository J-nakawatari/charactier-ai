/**
 * 認証ユーティリティ
 * JWT認証システム
 */

import { API_BASE_URL } from '@/lib/api-config';
import * as gtag from '@/lib/gtag';

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
 * 認証ヘッダーを取得
 */
export function getAuthHeaders(): HeadersInit {
  // 管理画面では専用のトークンキーを使用
  const isAdminPage = typeof window !== 'undefined' && window.location.pathname.includes('/admin');
  const tokenKey = isAdminPage ? 'adminAccessToken' : 'accessToken';
  const token = localStorage.getItem(tokenKey);
  
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  return {
    'Content-Type': 'application/json'
  };
}

/**
 * 管理画面専用の認証ヘッダーを取得（確実にadminAccessTokenを使用）
 */
export function getAdminAuthHeaders(): HeadersInit {
  const adminToken = localStorage.getItem('adminAccessToken');
  
  if (adminToken) {
    return {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };
  }

  return {
    'Content-Type': 'application/json'
  };
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
  const refresh = getAdminRefreshToken();
  if (!refresh) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refresh }),
    });

    if (response.ok) {
      const data = await response.json();
      setAdminAccessToken(data.accessToken);
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
 * 認証済みかどうかの判定
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  const user = getCurrentUser();
  return !!(token && user);
}

/**
 * トークンリフレッシュ
 */
export async function refreshToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refresh }),
    });

    if (response.ok) {
      const data = await response.json();
      setAccessToken(data.accessToken);
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }

  return false;
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
 * 認証が必要なAPIリクエスト
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = getAuthHeaders();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  // 401の場合はトークンリフレッシュを試行
  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      // リフレッシュ成功時は再リクエスト
      const newHeaders = getAuthHeaders();
      return fetch(url, {
        ...options,
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
  
  const response = await fetch(url, {
    ...options,
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
      return fetch(url, {
        ...options,
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