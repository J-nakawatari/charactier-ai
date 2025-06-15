import { NextRequest, NextResponse } from 'next/server';

interface ApiProxyOptions {
  requireAuth?: boolean;
  method?: string;
}

/**
 * バックエンドAPIへのプロキシ関数
 * 共通的なAPI転送処理を提供
 */
export async function createApiProxy(
  backendPath: string,
  request: NextRequest,
  options: ApiProxyOptions = {}
): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    
    // 環境変数からバックエンドURLを取得（デフォルトはlocalhost:5000）
    const backendBaseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const backendUrl = `${backendBaseUrl}${backendPath}${queryString ? `?${queryString}` : ''}`;
    
    console.log(`🔗 API Proxy: ${backendPath} → ${backendUrl}`);
    
    // ヘッダー設定
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // 認証が必要な場合、Authorizationヘッダーを転送
    if (options.requireAuth) {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }
    }
    
    // リクエストボディの処理
    let body: string | undefined;
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      try {
        const requestBody = await request.json();
        body = JSON.stringify(requestBody);
      } catch {
        // ボディが空またはJSONでない場合は無視
      }
    }
    
    // バックエンドへリクエスト
    const response = await fetch(backendUrl, {
      method: options.method || request.method,
      headers,
      ...(body && { body })
    });

    if (!response.ok) {
      console.error(`❌ Backend API error: ${response.status} ${response.statusText}`);
      
      // エラーレスポンスの詳細を取得
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = { error: `HTTP ${response.status}`, details: response.statusText };
      }
      
      return NextResponse.json(errorDetails, { status: response.status });
    }

    const data = await response.json();
    console.log(`✅ API Proxy success: ${backendPath}`);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ API Proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * 認証付きAPIプロキシの簡易ヘルパー
 */
export async function createAuthenticatedApiProxy(
  backendPath: string,
  request: NextRequest
): Promise<NextResponse> {
  return createApiProxy(backendPath, request, { requireAuth: true });
}

/**
 * バックエンドURL取得ヘルパー
 */
export function getBackendUrl(path: string): string {
  const backendBaseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  return `${backendBaseUrl}${path}`;
}