/**
 * Cookie認証ユーティリティ（段階的移行用）
 * HttpOnly Cookieを使用した認証システム
 */

import { API_BASE_URL } from '@/lib/api-config';
import * as authUtils from './auth';

/**
 * Cookie認証を使用するかどうかのフラグ
 * 段階的移行のため、初期値はfalse
 */
export const USE_COOKIE_AUTH = process.env.NEXT_PUBLIC_USE_COOKIE_AUTH === 'true';

/**
 * 認証ヘッダーを取得（Cookie認証対応版）
 */
export function getAuthHeaders(): HeadersInit {
  // Cookie認証が無効な場合は既存の実装を使用
  if (!USE_COOKIE_AUTH) {
    return authUtils.getAuthHeaders();
  }

  // Cookie認証が有効な場合、credentialsを含める
  return {
    'Content-Type': 'application/json'
  };
}

/**
 * 認証が必要なAPIリクエスト（Cookie認証対応版）
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Cookie認証が無効な場合は既存の実装を使用
  if (!USE_COOKIE_AUTH) {
    return authUtils.authenticatedFetch(url, options);
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Cookie認証のため必須
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // 401の場合はトークンリフレッシュを試行
  if (response.status === 401) {
    const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (refreshResponse.ok) {
      // リフレッシュ成功時は再リクエスト
      return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    } else {
      // リフレッシュ失敗時はログアウト
      await logoutWithCookie();
      throw new Error('Authentication failed');
    }
  }

  return response;
}

/**
 * ログアウト処理（Cookie認証対応版）
 */
export async function logoutWithCookie(): Promise<void> {
  if (USE_COOKIE_AUTH) {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // 既存のクリア処理も実行
  authUtils.logout();
}

/**
 * トークン検証（Cookie認証対応版）
 */
export async function verifyToken(): Promise<boolean> {
  if (!USE_COOKIE_AUTH) {
    return authUtils.isAuthenticated();
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-token`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.valid && data.user) {
        authUtils.setCurrentUser(data.user);
        return true;
      }
    }
  } catch (error) {
    console.error('Token verification failed:', error);
  }

  return false;
}

/**
 * ログイン処理（Cookie認証対応版）
 */
export async function loginWithCookie(email: string, password: string): Promise<{
  success: boolean;
  user?: authUtils.AuthUser;
  tokens?: { accessToken: string; refreshToken: string };
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      credentials: 'include', // Cookie認証のため必須
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // ユーザー情報を保存
      if (data.user) {
        authUtils.setCurrentUser(data.user);
      }

      // 既存のlocalStorage方式も保持（段階的移行のため）
      if (!USE_COOKIE_AUTH && data.tokens) {
        authUtils.setAccessToken(data.tokens.accessToken);
        authUtils.setRefreshToken(data.tokens.refreshToken);
      }

      return {
        success: true,
        user: data.user,
        tokens: data.tokens,
      };
    } else {
      return {
        success: false,
        error: data.message || 'ログインに失敗しました',
      };
    }
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'ネットワークエラーが発生しました',
    };
  }
}

/**
 * 管理者ログイン処理（Cookie認証対応版）
 */
export async function adminLoginWithCookie(email: string, password: string): Promise<{
  success: boolean;
  user?: any;
  tokens?: { accessToken: string; refreshToken: string };
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // 既存のlocalStorage方式も保持（段階的移行のため）
      if (!USE_COOKIE_AUTH && data.tokens) {
        authUtils.setAdminAccessToken(data.tokens.accessToken);
        authUtils.setAdminRefreshToken(data.tokens.refreshToken);
      }

      return {
        success: true,
        user: data.user,
        tokens: data.tokens,
      };
    } else {
      return {
        success: false,
        error: data.message || '管理者ログインに失敗しました',
      };
    }
  } catch (error) {
    console.error('Admin login error:', error);
    return {
      success: false,
      error: 'ネットワークエラーが発生しました',
    };
  }
}