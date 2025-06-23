import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/utils/backend-client';

export async function GET(request: NextRequest) {
  try {
    // 統一APIクライアントを使用（認証はCookieで処理される）
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