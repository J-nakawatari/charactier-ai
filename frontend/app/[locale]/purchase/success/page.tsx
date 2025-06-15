'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Coins, ArrowLeft } from 'lucide-react';
import { getAuthHeaders } from '@/utils/auth';

function PurchaseSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [processing, setProcessing] = useState(true);
  const [purchaseData, setPurchaseData] = useState<{
    type: 'token' | 'character';
    addedTokens?: number;
    newBalance?: number;
    characterName?: string;
    characterId?: string;
  } | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      processPurchaseWithSSE();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const processPurchaseWithSSE = async () => {
    try {
      console.log('🎉 決済成功ページ (SSE版): Session ID', sessionId);
      
      let eventSource: EventSource | null = null;
      let fallbackTimeout: NodeJS.Timeout;
      
      // SSEでリアルタイム通知を受信（本番環境対応）
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
      eventSource = new EventSource(`${backendUrl}/api/purchase/events/${sessionId}`);
      
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
          
          if (data.addedTokens || data.characterId) {
            console.log('✅ SSE: 購入完了通知受信');
            setPurchaseData({
              type: data.type || (data.addedTokens ? 'token' : 'character'),
              addedTokens: data.addedTokens,
              newBalance: data.newBalance,
              characterName: data.characterName,
              characterId: data.characterId
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
      
      // Stripe Session情報から購入情報を取得
      const sessionResponse = await fetch(`/api/purchase/session/${sessionId}`, {
        headers: getAuthHeaders()
      });
      let sessionData = null;
      
      if (sessionResponse.ok) {
        sessionData = await sessionResponse.json();
        console.log('💰 購入情報取得:', sessionData);
      }
      
      // 初期ユーザー情報取得
      const userResponse = await fetch('/api/auth/user', {
        headers: getAuthHeaders()
      });
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
        
        const updatedUserResponse = await fetch('/api/auth/user', {
          headers: getAuthHeaders()
        });
        if (!updatedUserResponse.ok) {
          throw new Error('更新されたユーザー情報の取得に失敗しました');
        }
        
        finalUserData = await updatedUserResponse.json();
        console.log(`🔄 フォールバック リトライ ${retryCount + 1}: 残高 ${finalUserData.tokenBalance}`);
        
        // 購入タイプに応じて処理を分岐
        if (sessionData?.type === 'character') {
          // キャラクター購入の場合はトークン残高変化をチェックしない
          console.log('✅ フォールバック: キャラクター購入完了');
          setPurchaseData({
            type: 'character',
            characterName: sessionData.characterName || 'キャラクター',
            characterId: sessionData.characterId
          });
          setProcessing(false);
          return;
        } else {
          // トークン購入の場合は残高変化をチェック
          const tokensAdded = finalUserData.tokenBalance - userData.tokenBalance;
          if (tokensAdded > 0) {
            console.log('✅ フォールバック: トークン増加確認:', tokensAdded);
            setPurchaseData({
              type: 'token',
              addedTokens: tokensAdded,
              newBalance: finalUserData.tokenBalance
            });
            setProcessing(false);
            return;
          }
        }
        
        retryCount++;
      }
      
      // フォールバック処理でも確認できない場合
      if (sessionData) {
        console.log('📋 フォールバック: セッション情報から表示:', sessionData);
        if (sessionData.type === 'character') {
          setPurchaseData({
            type: 'character',
            characterName: sessionData.characterName || 'キャラクター',
            characterId: sessionData.characterId
          });
        } else if (sessionData.tokens) {
          setPurchaseData({
            type: 'token',
            addedTokens: sessionData.tokens,
            newBalance: finalUserData.tokenBalance
          });
        }
      } else {
        setPurchaseData({
          type: 'token',
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
    if (purchaseData?.type === 'character' && purchaseData.characterId) {
      // キャラクター購入の場合は購入したキャラクターのチャット画面に遷移
      router.push(`/ja/characters/${purchaseData.characterId}/chat`);
    } else {
      // トークン購入の場合は元のチャット画面情報を取得
      const returnCharacterId = localStorage.getItem('returnToCharacterId');
      const returnLocale = localStorage.getItem('returnToLocale') || 'ja';
      
      if (returnCharacterId) {
        // 保存されたキャラクターIDに戻る
        localStorage.removeItem('returnToCharacterId');
        localStorage.removeItem('returnToLocale');
        router.push(`/${returnLocale}/characters/${returnCharacterId}/chat`);
      } else {
        // フォールバック: キャラクター一覧画面
        router.push('/ja/characters');
      }
    }
  };

  const handleBackToCharacterList = () => {
    // キャラクター一覧に戻る場合、購入完了フラグを設定
    localStorage.setItem('purchaseCompleted', 'true');
    router.push('/ja/characters');
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
        ) : purchaseData ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              購入完了！
            </h2>
            
            {purchaseData.type === 'character' ? (
              <>
                <p className="text-gray-600 mb-6">
                  キャラクター「{purchaseData.characterName}」の購入が完了しました。
                </p>
                
                <div className="bg-purple-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <span className="text-2xl">🎭</span>
                    <span className="font-semibold text-purple-800">
                      {purchaseData.characterName}
                    </span>
                  </div>
                  <div className="text-sm text-purple-700">
                    キャラクターがアンロックされました
                  </div>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={handleBackToChat}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{purchaseData.characterName}とチャットする</span>
                  </button>
                  
                  <button
                    onClick={handleBackToCharacterList}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <span>キャラクター一覧に戻る</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-6">
                  トークチケットの購入が完了しました。
                </p>
                
                <div className="bg-green-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Coins className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">
                      +{purchaseData.addedTokens?.toLocaleString() || 0}枚
                    </span>
                  </div>
                  <div className="text-sm text-green-700">
                    新しい残高: {purchaseData.newBalance?.toLocaleString() || 0}枚
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
            )}
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

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">決済情報を確認中...</p>
        </div>
      </div>
    }>
      <PurchaseSuccessContent />
    </Suspense>
  );
}