/**
 * 管理者用トークン自動リフレッシュユーティリティ
 */

import { API_BASE_URL } from '@/lib/api-config';

// トークンの有効期限を解析するためのインターフェース
interface JWTPayload {
  exp?: number;
  iat?: number;
  id?: string;
  t?: string;
}

// リフレッシュ状態を管理
let refreshTimer: NodeJS.Timeout | null = null;
let isRefreshing = false;

/**
 * JWTトークンをデコード（署名検証なし）
 */
function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * アクセストークンの有効期限までの残り時間を取得（ミリ秒）
 */
function getTokenExpirationTime(token: string): number | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return null;
  
  const now = Date.now();
  const expTime = payload.exp * 1000; // expはUNIXタイムスタンプ（秒）
  return expTime - now;
}

/**
 * HttpOnlyクッキーからアクセストークンを取得
 * 注意: HttpOnlyクッキーはJavaScriptからアクセスできないため、
 * この関数は通常のクッキーまたはlocalStorageからトークンを取得
 */
function getAdminAccessToken(): string | null {
  // localStorageから取得（従来方式の場合）
  if (typeof window !== 'undefined') {
    return localStorage.getItem('adminAccessToken');
  }
  return null;
}

/**
 * 管理者トークンをリフレッシュ
 */
export async function refreshAdminToken(): Promise<boolean> {
  if (isRefreshing) {
    console.log('Admin token refresh already in progress');
    return false;
  }

  isRefreshing = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/admin/refresh`, {
      method: 'POST',
      credentials: 'include', // HttpOnlyクッキーを送信
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      // 従来方式の場合、新しいアクセストークンをlocalStorageに保存
      if (data.accessToken) {
        localStorage.setItem('adminAccessToken', data.accessToken);
      }
      
      console.log('Admin token refreshed successfully');
      return true;
    } else {
      console.error('Admin token refresh failed:', response.status);
      
      // 401の場合はリフレッシュトークンも無効
      if (response.status === 401) {
        // 管理者をログアウト
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        window.location.href = '/admin/login';
      }
    }
  } catch (error) {
    console.error('Admin token refresh error:', error);
  } finally {
    isRefreshing = false;
  }

  return false;
}

/**
 * 次のリフレッシュをスケジュール
 */
function scheduleNextRefresh(token: string): void {
  // 既存のタイマーをクリア
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const timeUntilExpiry = getTokenExpirationTime(token);
  if (!timeUntilExpiry || timeUntilExpiry <= 0) {
    console.log('Token already expired or invalid');
    refreshAdminToken();
    return;
  }

  // 有効期限の5分前にリフレッシュ（または残り時間の80%の時点）
  const refreshTime = Math.min(timeUntilExpiry - 5 * 60 * 1000, timeUntilExpiry * 0.8);
  
  if (refreshTime <= 0) {
    // すぐにリフレッシュが必要
    console.log('Token expiring soon, refreshing immediately');
    refreshAdminToken().then((success) => {
      if (success) {
        const newToken = getAdminAccessToken();
        if (newToken) {
          scheduleNextRefresh(newToken);
        }
      }
    });
  } else {
    console.log(`Scheduling admin token refresh in ${Math.round(refreshTime / 1000)} seconds`);
    
    refreshTimer = setTimeout(async () => {
      const success = await refreshAdminToken();
      if (success) {
        const newToken = getAdminAccessToken();
        if (newToken) {
          scheduleNextRefresh(newToken);
        }
      }
    }, refreshTime);
  }
}

/**
 * 管理者トークン自動リフレッシュを初期化
 */
export function initAdminTokenRefresh(): void {
  // HttpOnly Cookie方式の場合は、サーバー側でトークンの有効期限を管理
  // ここでは従来方式（localStorage）の場合のみ処理
  const token = getAdminAccessToken();
  
  if (token) {
    scheduleNextRefresh(token);
  }
}

/**
 * 管理者トークン自動リフレッシュを停止
 */
export function stopAdminTokenRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * 管理者認証付きfetch関数
 * 401エラーの場合は自動的にトークンをリフレッシュして再試行
 */
export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const makeRequest = async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
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

    return fetch(url, {
      ...options,
      credentials: 'include', // HttpOnlyクッキーを送信
      headers,
    });
  };

  let response = await makeRequest();

  // 401の場合はトークンリフレッシュして再試行
  if (response.status === 401 && !url.includes('/auth/')) {
    console.log('Received 401, attempting to refresh admin token');
    const refreshed = await refreshAdminToken();
    
    if (refreshed) {
      // リフレッシュ成功したら再度リクエスト
      response = await makeRequest();
    } else {
      // リフレッシュ失敗したらログインページへ
      window.location.href = '/admin/login';
    }
  }

  return response;
}