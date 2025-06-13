import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 認証ヘッダーを取得
    const authorization = request.headers.get('authorization');
    const authToken = request.headers.get('x-auth-token');

    if (!authorization && !authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // バックエンドAPIにプロキシ
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3004';
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authorization) {
      headers['Authorization'] = authorization;
    }
    if (authToken) {
      headers['x-auth-token'] = authToken;
    }

    const response = await fetch(`${backendUrl}/api/user/dashboard`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend dashboard API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch dashboard data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Dashboard API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}