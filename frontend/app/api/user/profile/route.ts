import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔗 User Profile API Route: プロキシ先バックエンド');
    
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
    
    // バックエンドAPIに転送
    const backendUrl = `http://localhost:3004/api/user/dashboard`;
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
    
    // ユーザープロファイル形式に整形
    const userProfile = {
      user: data.user,
      tokenBalance: data.tokens?.balance || data.user?.tokenBalance || 0,
      totalPurchased: data.tokens?.totalPurchased || 0,
      totalUsed: data.tokens?.totalUsed || 0,
      affinities: data.affinities || [],
      recentChats: data.recentChats || []
    };
    
    return NextResponse.json(userProfile);
    
  } catch (error) {
    console.error('User Profile API Route Error:', error);
    return NextResponse.json(
      { 
        error: 'ユーザー情報の取得中にエラーが発生しました',
        code: 'USER_PROFILE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}