import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    console.log('🔍 Session情報取得API:', sessionId);
    
    // 認証ヘッダーを取得
    const authHeader = req.headers.get('Authorization');
    
    // バックエンドAPIからセッション情報を取得
    const backendUrl = `http://localhost:5000/api/purchase/session/${sessionId}`;
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
        { error: 'Failed to fetch session data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Session API Route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}