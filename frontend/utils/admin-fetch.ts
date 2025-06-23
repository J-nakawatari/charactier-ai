/**
 * 管理者API用のfetchラッパー
 * HttpOnlyクッキーを使用した認証を行う
 */

import { API_BASE_URL } from '@/lib/api-config';

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * 管理者API用のfetch関数
 * 自動的にクッキーを含めて送信する
 */
export async function adminFetch(
  endpoint: string, 
  options: FetchOptions = {}
): Promise<Response> {
  const { requireAuth = true, ...fetchOptions } = options;
  
  // エンドポイントがフルURLでない場合はAPI_BASE_URLを追加
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: 'include', // クッキーを送信
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  // 認証エラーの場合は管理者ログインページへリダイレクト
  if (requireAuth && response.status === 401) {
    window.location.href = '/admin/login';
  }

  return response;
}

/**
 * JSON形式でデータを取得する便利関数
 */
export async function adminFetchJSON<T = any>(
  endpoint: string,
  options?: FetchOptions
): Promise<T> {
  const response = await adminFetch(endpoint, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API Error: ${response.status}`);
  }
  
  return response.json();
}