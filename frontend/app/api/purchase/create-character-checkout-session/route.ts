import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization');
    const body = await req.json();

    console.log('🔄 API Proxy: キャラクター購入リクエスト受信:', body);
    console.log('🔑 API Proxy: 認証トークン:', token ? 'あり' : 'なし');

    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/purchase/create-character-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token || ''
      },
      body: JSON.stringify(body)
    });

    console.log('📡 API Proxy: バックエンドレスポンス状態:', response.status);

    const data = await response.json();
    console.log('📋 API Proxy: バックエンドレスポンス内容:', data);

    if (!response.ok) {
      console.error('❌ API Proxy: バックエンドエラー:', data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ API Proxy エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'API Proxy で予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}