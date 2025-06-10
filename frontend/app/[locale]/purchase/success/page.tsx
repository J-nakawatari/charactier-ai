'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Coins, ArrowLeft } from 'lucide-react';

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [processing, setProcessing] = useState(true);
  const [tokenData, setTokenData] = useState<{
    addedTokens: number;
    newBalance: number;
  } | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      processPurchaseWithSSE();
    }
  }, [sessionId]);

  const processPurchaseWithSSE = async () => {
    try {
      console.log('🎉 決済成功ページ (SSE版): Session ID', sessionId);
      
      let eventSource: EventSource | null = null;
      let fallbackTimeout: NodeJS.Timeout;
      
      // SSEでリアルタイム通知を受信
      eventSource = new EventSource(`/api/purchase/events/${sessionId}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🌊 SSE受信:', data);
          
          if (data.error === 'timeout') {
            console.log('⏰ SSE タイムアウト、フォールバック処理に移行');
            eventSource?.close();
            startFallbackProcess();
            return;
          }
          
          if (data.addedTokens) {
            console.log('✅ SSE: 購入完了通知受信');
            setTokenData({
              addedTokens: data.addedTokens,
              newBalance: data.newBalance
            });
            setProcessing(false);
            eventSource?.close();
            clearTimeout(fallbackTimeout);
          }
        } catch (parseError) {
          console.error('❌ SSE データ解析エラー:', parseError);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('❌ SSE接続エラー:', error);
        eventSource?.close();
        startFallbackProcess();
      };
      
      // 35秒後にフォールバック処理を開始（SSEタイムアウト後）
      fallbackTimeout = setTimeout(() => {
        console.log('⏰ SSE全体タイムアウト、フォールバック処理開始');
        eventSource?.close();
        startFallbackProcess();
      }, 35000);
      
      // クリーンアップ関数
      const cleanup = () => {
        eventSource?.close();
        clearTimeout(fallbackTimeout);
      };
      
      // コンポーネントアンマウント時のクリーンアップ
      window.addEventListener('beforeunload', cleanup);
      
      return () => {
        cleanup();
        window.removeEventListener('beforeunload', cleanup);
      };
      
    } catch (error) {
      console.error('SSE処理エラー:', error);
      startFallbackProcess();
    }
  };
  
  const startFallbackProcess = async () => {
    try {
      console.log('🔄 フォールバック処理開始（従来のポーリング方式）');
      
      // Stripe Session情報から購入トークン数を取得
      const sessionResponse = await fetch(`/api/purchase/session/${sessionId}`);
      let purchasedTokens = null;
      
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        purchasedTokens = sessionData.tokens;
        console.log('💰 購入トークン数取得:', purchasedTokens);
      }
      
      // 初期ユーザー情報取得
      const userResponse = await fetch('/api/auth/user');
      if (!userResponse.ok) {
        throw new Error('ユーザー情報の取得に失敗しました');
      }
      
      const userData = await userResponse.json();
      console.log('👤 初期ユーザーデータ:', userData.tokenBalance);
      
      // 簡略化されたリトライ（SSE失敗時なので短縮）
      let retryCount = 0;
      const maxRetries = 3;
      let finalUserData = userData;
      
      while (retryCount < maxRetries) {
        const waitTime = 2000 + (retryCount * 1000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        const updatedUserResponse = await fetch('/api/auth/user');
        if (!updatedUserResponse.ok) {
          throw new Error('更新されたユーザー情報の取得に失敗しました');
        }
        
        finalUserData = await updatedUserResponse.json();
        console.log(`🔄 フォールバック リトライ ${retryCount + 1}: 残高 ${finalUserData.tokenBalance}`);
        
        const tokensAdded = finalUserData.tokenBalance - userData.tokenBalance;
        if (tokensAdded > 0) {
          console.log('✅ フォールバック: トークン増加確認:', tokensAdded);
          setTokenData({
            addedTokens: tokensAdded,
            newBalance: finalUserData.tokenBalance
          });
          setProcessing(false);
          return;
        }
        
        retryCount++;
      }
      
      // フォールバック処理でも確認できない場合
      if (purchasedTokens) {
        console.log('📋 フォールバック: セッション情報から表示:', purchasedTokens);
        setTokenData({
          addedTokens: purchasedTokens,
          newBalance: finalUserData.tokenBalance + purchasedTokens
        });
      } else {
        setTokenData({
          addedTokens: 0,
          newBalance: finalUserData.tokenBalance
        });
      }
      
      setProcessing(false);
      
    } catch (error) {
      console.error('フォールバック処理エラー:', error);
      setProcessing(false);
    }
  };

  const handleBackToChat = () => {
    router.push('/ja/characters/3/chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
        {processing ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">決済処理中...</h2>
            <p className="text-gray-600">
              決済の確認とトークンの付与を処理しています。
            </p>
          </>
        ) : tokenData ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              購入完了！
            </h2>
            
            <p className="text-gray-600 mb-6">
              トークチケットの購入が完了しました。
            </p>
            
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Coins className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">
                  +{tokenData.addedTokens.toLocaleString()}枚
                </span>
              </div>
              <div className="text-sm text-green-700">
                新しい残高: {tokenData.newBalance.toLocaleString()}枚
              </div>
            </div>
            
            <button
              onClick={handleBackToChat}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>チャットに戻る</span>
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-red-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              エラーが発生しました
            </h2>
            
            <p className="text-gray-600 mb-6">
              決済の処理中にエラーが発生しました。サポートにお問い合わせください。
            </p>
            
            <button
              onClick={handleBackToChat}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>チャットに戻る</span>
            </button>
          </>
        )}
        
        {sessionId && (
          <div className="mt-4 text-xs text-gray-400">
            Session ID: {sessionId.substring(0, 20)}...
          </div>
        )}
      </div>
    </div>
  );
}