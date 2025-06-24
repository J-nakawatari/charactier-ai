import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/utils/backend-client';

export async function GET(request: NextRequest) {
  try {
    console.log('🔗 User Profile API Route: プロキシ先バックエンド');
    console.log('📍 Backend URL:', process.env.BACKEND_URL || 'http://localhost:5000');
    
    // 統一されたクライアントを使用してバックエンドを呼び出し
    const response = await backendClient.proxyRequest(request, '/api/user/profile');

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
    console.log('🔍 Backend data.user.purchasedCharacters:', data.user?.purchasedCharacters);
    const userProfile = {
      user: {
        ...data.user,
        selectedCharacter: data.user?.selectedCharacter
      },
      tokenBalance: data.tokens?.balance || data.user?.tokenBalance || 0,
      totalPurchased: data.tokens?.totalPurchased || 0,
      totalUsed: data.tokens?.totalUsed || 0,
      affinities: data.affinities || [],
      recentChats: data.recentChats || [],
      purchasedCharacters: data.user?.purchasedCharacters?.map((char: any) => char.id) || []
    };
    console.log('🔍 Frontend userProfile.purchasedCharacters:', userProfile.purchasedCharacters);
    
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