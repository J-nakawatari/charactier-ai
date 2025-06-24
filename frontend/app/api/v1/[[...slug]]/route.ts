import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// バックエンドのベースURL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
const API_BASE = `/api/${API_VERSION}`;

async function handler(
  req: NextRequest,
  { params }: { params: { slug?: string[] } }
) {
  try {
    // スラッグからパスを構築
    const path = params.slug ? params.slug.join('/') : '';
    const url = `${BACKEND_URL}${API_BASE}/${path}${req.nextUrl.search}`;

    console.log(`[Proxy] ${req.method} ${url}`);

    // リクエストヘッダーをコピー
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      // ホストヘッダーは除外
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    });

    // クッキーを転送
    const cookieStore = cookies();
    const cookieHeader = cookieStore.toString();
    if (cookieHeader) {
      headers.set('Cookie', cookieHeader);
    }

    // Content-Typeの処理
    const contentType = req.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      headers.set('Content-Type', 'application/json');
    }

    // リクエストボディの処理
    let body: any = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (contentType?.includes('application/json')) {
        try {
          body = await req.json();
        } catch {
          body = await req.text();
        }
      } else {
        body = await req.text();
      }
    }

    // バックエンドへのリクエスト
    const response = await fetch(url, {
      method: req.method,
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      // @ts-ignore - Next.js特有のオプション
      duplex: 'half',
    });

    // SSE (Server-Sent Events) の処理
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      // SSEの場合はストリーミングレスポンスを返す
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // レスポンスボディの処理
    const responseText = await response.text();
    
    // レスポンスヘッダーをコピー
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Set-Cookieヘッダーは特別に処理
      if (key.toLowerCase() !== 'set-cookie') {
        responseHeaders.set(key, value);
      }
    });

    // Set-Cookieヘッダーの処理
    const setCookieHeaders = response.headers.getSetCookie();
    if (setCookieHeaders.length > 0) {
      setCookieHeaders.forEach((cookie) => {
        responseHeaders.append('Set-Cookie', cookie);
      });
    }

    return new NextResponse(responseText, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// HTTPメソッドのエクスポート
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;