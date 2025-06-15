import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  
  console.log('🌊 フロントエンド SSE プロキシ:', sessionId);
  
  try {
    // 認証ヘッダーを取得
    const authHeader = req.headers.get('Authorization');
    
    // バックエンドのSSEエンドポイントにプロキシ
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/purchase/events/${sessionId}`;
    
    const headers: HeadersInit = {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
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
      console.error('Backend SSE error:', response.status);
      return NextResponse.json(
        { error: 'Failed to connect to SSE stream' },
        { status: response.status }
      );
    }

    // SSEストリームをフロントエンドに転送
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('SSE Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}