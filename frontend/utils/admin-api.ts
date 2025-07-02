import Cookies from 'js-cookie';
import { adminFetch as adminFetchWithRefresh } from './adminTokenRefresh';

interface AdminApiOptions extends RequestInit {
  // Additional options can be added here
}

/**
 * Admin API utility for making authenticated requests
 * Uses HttpOnly cookies for authentication instead of localStorage
 * NOTE: この関数は adminTokenRefresh.ts の adminFetch を使用するようにエクスポートを変更
 */
async function adminFetchOld(endpoint: string, options: AdminApiOptions = {}) {
  // For production, use relative URLs that will be proxied by Next.js
  // This ensures cookies are sent properly
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  const url = endpoint.startsWith('http') ? endpoint : 
              endpoint.startsWith('/api/') ? endpoint : 
              `${backendUrl}${endpoint}`;
  
  console.log('🔐 Admin API Request:', {
    url,
    method: options.method || 'GET',
    credentials: 'include'
  });
  
  // デフォルトヘッダーを設定
  const defaultHeaders: Record<string, string> = {};
  
  // FormDataの場合はContent-Typeを設定しない（ブラウザが自動設定）
  const isFormData = options.body instanceof FormData;
  if (!isFormData) {
    defaultHeaders['Content-Type'] = 'application/json';
  }
  
  // CSRFトークンを取得
  const token = Cookies.get('XSRF-TOKEN');
  const method = (options.method || 'GET').toUpperCase();
  
  // POST, PUT, PATCH, DELETEリクエストにCSRFトークンを追加
  if (token && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    defaultHeaders['X-CSRF-Token'] = token;
  }
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      ...defaultHeaders,
      ...(options.headers as Record<string, string> || {})
    },
  });

  // Handle unauthorized responses
  if (response.status === 401 || response.status === 403) {
    console.error('🚨 Admin API Error:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });
    
    // Log the error response for debugging
    const errorText = await response.text();
    console.error('🚨 Error Response:', errorText);
    
    // For now, don't redirect to allow debugging
    // if (typeof window !== 'undefined') {
    //   window.location.href = '/admin/login';
    // }
    throw new Error(`Unauthorized: ${response.status} - ${errorText}`);
  }

  return response;
}

// adminTokenRefresh.tsのadminFetchをエクスポート（自動リフレッシュ機能付き）
export const adminFetch = adminFetchWithRefresh;

/**
 * GET request helper
 */
export async function adminGet(endpoint: string) {
  return adminFetch(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function adminPost(endpoint: string, data: any) {
  return adminFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUT request helper
 */
export async function adminPut(endpoint: string, data: any) {
  return adminFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request helper
 */
export async function adminDelete(endpoint: string) {
  return adminFetch(endpoint, { method: 'DELETE' });
}