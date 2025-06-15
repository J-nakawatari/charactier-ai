import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Select Character API Route: プロキシ先バックエンド');
    
    // リクエストボディを取得
    const body = await request.json();
    
    // 認証ヘッダーを転送
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // リクエストからJWT認証ヘッダーを転送
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // モック認証ヘッダーも転送（開発用）
    const mockAuthHeader = request.headers.get('x-auth-token');
    if (mockAuthHeader) {
      headers['x-auth-token'] = mockAuthHeader;
    }
    
    // バックエンドAPIに転送（OpenAPI仕様に従う）
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/user/select-character`;
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend API error:', response.status, errorData);
      
      return NextResponse.json(
        { 
          error: `Backend API error: ${response.status}`,
          code: 'BACKEND_ERROR',
          details: errorData
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Select Character API Route Error:', error);
    return NextResponse.json(
      { 
        error: 'キャラクター選択中にエラーが発生しました',
        code: 'SELECT_CHARACTER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}