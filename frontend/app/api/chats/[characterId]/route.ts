import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'ja';
    
    
    // バックエンドAPIに転送
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/chats/${characterId}?locale=${locale}`;
    
    // 認証ヘッダーを転送（必要に応じて）
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
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
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
    
    // レスポンスヘッダーをコピー（必要に応じて）
    const responseHeaders = new Headers();
    responseHeaders.set('Cache-Control', 'no-store');
    
    return NextResponse.json(data, { headers: responseHeaders });
    
  } catch (error) {
    console.error('Chat API Route Error (GET):', error);
    return NextResponse.json(
      { 
        error: 'チャット履歴の取得中にエラーが発生しました',
        code: 'CHAT_API_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const body = await request.json();
    
    
    // バックエンドAPIに転送
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/chats/${characterId}/messages`;
    
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
    
    // レスポンスヘッダーをコピー（必要に応じて）
    const responseHeaders = new Headers();
    responseHeaders.set('Cache-Control', 'no-store');
    
    return NextResponse.json(data, { headers: responseHeaders });
    
  } catch (error) {
    console.error('Chat API Route Error (POST):', error);
    return NextResponse.json(
      { 
        error: 'メッセージ送信中にエラーが発生しました',
        code: 'CHAT_API_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}