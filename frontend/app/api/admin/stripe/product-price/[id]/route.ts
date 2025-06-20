import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get('authorization');
    const { id } = await params;

    console.log('🔍 API Proxy: 価格取得リクエスト:', id);

    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/admin/stripe/product-price/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token || ''
      }
    });

    console.log('📡 API Proxy: バックエンドレスポンス状態:', response.status);

    const data = await response.json();
    console.log('📋 API Proxy: バックエンドレスポンスデータ:', data);

    if (!response.ok) {
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