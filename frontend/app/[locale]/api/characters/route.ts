import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    
    console.log('🔗 [locale]/api ルート: バックエンドにプロキシ', queryString);
    
    // バックエンドAPIに転送
    const backendUrl = `http://localhost:3002/api/characters?${queryString}`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('バックエンドAPIエラー:', response.status, response.statusText);
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('🔗 APIプロキシ成功:', data.total, '件のキャラクター');
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('APIルートエラー:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}