/**
 * 既存のfetch呼び出しからaxiosへの移行ヘルパー
 * 段階的な移行をサポート
 */

import { apiClient, adminApiClient } from '@/lib/axios-config';
import { authenticatedFetch, adminAuthenticatedFetch } from '@/utils/auth';

/**
 * 既存のauthenticatedFetchをaxiosベースに置き換え
 * 後方互換性を維持しながらsilent refreshを有効化
 */
export async function enhancedAuthenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  try {
    // FetchオプションをAxios設定に変換
    const axiosConfig = {
      url,
      method: (options.method || 'GET') as any,
      data: options.body ? JSON.parse(options.body as string) : undefined,
      headers: options.headers as any,
    };

    // axiosでリクエスト実行
    const response = await apiClient.request(axiosConfig);

    // FetchのResponseオブジェクトを模倣
    const mockResponse = {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers as any),
      json: async () => response.data,
      text: async () => JSON.stringify(response.data),
      blob: async () => new Blob([JSON.stringify(response.data)]),
      arrayBuffer: async () => new ArrayBuffer(0),
      formData: async () => new FormData(),
      clone: () => mockResponse,
      body: null,
      bodyUsed: false,
      redirected: false,
      type: 'basic' as ResponseType,
      url: response.config.url || '',
      bytes: async () => new Uint8Array(),
    } as Response;

    return mockResponse;
  } catch (error: any) {
    // エラーが発生した場合は従来のfetchにフォールバック
    console.warn('Axios request failed, falling back to fetch:', error);
    return authenticatedFetch(url, options);
  }
}

/**
 * 管理者用の拡張fetch
 */
export async function enhancedAdminAuthenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  try {
    const axiosConfig = {
      url,
      method: (options.method || 'GET') as any,
      data: options.body ? JSON.parse(options.body as string) : undefined,
      headers: options.headers as any,
    };

    const response = await adminApiClient.request(axiosConfig);

    const mockResponse = {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers as any),
      json: async () => response.data,
      text: async () => JSON.stringify(response.data),
      blob: async () => new Blob([JSON.stringify(response.data)]),
      arrayBuffer: async () => new ArrayBuffer(0),
      formData: async () => new FormData(),
      clone: () => mockResponse,
      body: null,
      bodyUsed: false,
      redirected: false,
      type: 'basic' as ResponseType,
      url: response.config.url || '',
      bytes: async () => new Uint8Array(),
    } as Response;

    return mockResponse;
  } catch (error: any) {
    console.warn('Admin axios request failed, falling back to fetch:', error);
    return adminAuthenticatedFetch(url, options);
  }
}

/**
 * グローバルに既存のfetch関数を置き換える（オプション）
 * 開発環境でのみ使用を推奨
 */
export function enableSilentRefreshGlobally() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('🔄 Enabling global silent refresh for authenticated requests');
    
    // authenticatedFetchを置き換え
    (window as any).__originalAuthenticatedFetch = authenticatedFetch;
    (window as any).authenticatedFetch = enhancedAuthenticatedFetch;
    
    // adminAuthenticatedFetchを置き換え
    (window as any).__originalAdminAuthenticatedFetch = adminAuthenticatedFetch;
    (window as any).adminAuthenticatedFetch = enhancedAdminAuthenticatedFetch;
  }
}

/**
 * 置き換えを元に戻す
 */
export function disableSilentRefreshGlobally() {
  if (typeof window !== 'undefined') {
    const original = (window as any).__originalAuthenticatedFetch;
    if (original) {
      (window as any).authenticatedFetch = original;
    }
    
    const adminOriginal = (window as any).__originalAdminAuthenticatedFetch;
    if (adminOriginal) {
      (window as any).adminAuthenticatedFetch = adminOriginal;
    }
  }
}