import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { priceId, userId = 'mock_user_1' } = await request.json();
    
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    console.log('🔗 Checkout Session API: バックエンドにプロキシ', { priceId, userId });
    
    // 認証ヘッダーを取得
    const authHeader = request.headers.get('Authorization');
    
    // バックエンドAPIに転送
    const backendUrl = `http://localhost:5000/api/purchase/create-checkout-session`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // 認証ヘッダーがある場合は転送
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ priceId, userId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Backend API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Checkout Session APIルートエラー:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: (error as Error).message },
      { status: 500 }
    );
  }
}