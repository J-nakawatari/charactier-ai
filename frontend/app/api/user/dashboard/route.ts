import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/utils/backend-client';

export async function GET(request: NextRequest) {
  try {
    // 認証確認
    const authorization = request.headers.get('authorization');
    const authToken = request.headers.get('x-auth-token');

    if (!authorization && !authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 統一APIクライアントを使用
    const response = await backendClient.proxyRequest(request, '/api/user/dashboard');

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