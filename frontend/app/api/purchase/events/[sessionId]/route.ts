import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;
  
  console.log('🌊 フロントエンド SSE プロキシ:', sessionId);
  
  try {
    // バックエンドのSSEエンドポイントにプロキシ
    const backendUrl = `http://localhost:3004/api/purchase/events/${sessionId}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
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