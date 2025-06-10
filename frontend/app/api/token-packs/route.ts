import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive') || 'true';
    
    console.log('🔗 Token Packs API Route: ユーザー用APIに転送', `isActive=${isActive}`);
    
    // 認証ヘッダーを取得
    const authHeader = request.headers.get('authorization');
    
    // バックエンドのユーザー用APIに転送
    const backendUrl = `http://localhost:3004/api/token-packs?isActive=${isActive}&limit=50`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    
    // フロントエンド用にデータを整形
    const tokenPacks = data.tokenPacks.map((pack: any) => ({
      _id: pack._id,
      name: pack.name,
      description: pack.description,
      tokens: pack.tokens,
      price: pack.price,
      priceId: pack.priceId,
      isActive: pack.isActive,
      profitMargin: pack.profitMargin,
      tokenPerYen: pack.tokenPerYen
    }));

    return NextResponse.json({ tokenPacks });
    
  } catch (error) {
    console.error('Token Packs APIルートエラー:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}