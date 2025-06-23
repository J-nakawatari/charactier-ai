/**
 * バックエンドAPIとの通信を統一的に管理するクライアント
 * 
 * 重要な設計原則：
 * 1. 環境に関わらず内部通信はlocalhostを使用
 * 2. エラーハンドリングの一元化
 * 3. 認証ヘッダーの自動付与
 */

import { NextRequest } from 'next/server';

export class BackendClient {
  private baseUrl: string;
  
  constructor() {
    // 環境変数から取得、デフォルトはlocalhost:5000
    // 重要: 本番環境でもlocalhostを使用（Nginxが外部からのリクエストをプロキシ）
    this.baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    console.log('🔧 BackendClient initialized with:', this.baseUrl);
  }
  
  /**
   * バックエンドAPIを呼び出す統一メソッド
   */
  async fetch(path: string, options?: RequestInit): Promise<Response> {
    // パスが/で始まることを保証
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;
    
    console.log('🔗 BackendClient fetch:', url);
    
    try {
      // タイムアウトを設定（10秒）
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        credentials: 'include', // Always include credentials for cookie support
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        console.error('❌ BackendClient error:', response.status, response.statusText);
      }
      
      return response;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ BackendClient timeout error: Request took too long');
        // タイムアウトエラーを502として返す
        return new Response('Backend timeout', { status: 502 });
      }
      console.error('❌ BackendClient network error:', error);
      throw error;
    }
  }
  
  /**
   * Route HandlerからNextRequestのヘッダーを転送してバックエンドを呼び出す
   */
  async proxyRequest(request: NextRequest, backendPath: string): Promise<Response> {
    // 認証ヘッダーの転送
    const headers: HeadersInit = {};
    
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const mockAuthHeader = request.headers.get('x-auth-token');
    if (mockAuthHeader) {
      headers['x-auth-token'] = mockAuthHeader;
    }
    
    // Cookieヘッダーも転送（HttpOnly Cookieのため重要）
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
      console.log('🍪 Forwarding cookies to backend');
    }
    
    return this.fetch(backendPath, {
      method: request.method,
      headers,
      body: request.method !== 'GET' ? await request.text() : undefined
    });
  }
}

// シングルトンインスタンスをエクスポート
export const backendClient = new BackendClient();