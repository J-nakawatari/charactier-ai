import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('📦 Purchase history API proxy');
    
    // 認証ヘッダーを取得
    const authHeader = req.headers.get('Authorization');
    
    // バックエンドAPIにプロキシ
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/user/purchase-history`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // 認証ヘッダーがある場合は転送
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend API error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to fetch purchase history' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Purchase history API Route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}