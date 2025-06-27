'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, ArrowLeft, Coins } from 'lucide-react';
import { getAuthHeadersSync } from '@/utils/auth';

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
      fetchPurchaseData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const fetchPurchaseData = async () => {
    try {
      console.log('🎉 決済成功ページ: Session ID', sessionId);
      
      // 最新のユーザー情報を取得
      const userResponse = await fetch('/api/v1/auth/user', {
        headers: getAuthHeadersSync()
      });
      
      if (!userResponse.ok) {
        throw new Error('ユーザー情報の取得に失敗しました');
      }
      
      const userData = await userResponse.json();
      console.log('👤 購入完了後のユーザーデータ:', userData.tokenBalance);
      
      // 購入履歴から最新の購入情報を取得
      try {
        const historyResponse = await fetch('/api/v1/user/purchase-history', {
          headers: getAuthHeadersSync()
        });
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          console.log('📦 購入履歴データ:', historyData);
          
          // 最新の購入情報を取得
          if (historyData.purchases && historyData.purchases.length > 0) {
            const latestPurchase = historyData.purchases[0];
            
            // セッションIDが一致する、または1分以内の購入
            if (latestPurchase.stripeSessionId === sessionId || 
                (new Date().getTime() - new Date(latestPurchase.createdAt).getTime() < 60000)) {
              
              // キャラクター購入の場合は、キャラクター情報を取得
              if (latestPurchase.type === 'character') {
                // まずlocalStorageから情報を取得
                const savedCharacterName = localStorage.getItem('purchasingCharacterName');
                const savedCharacterId = localStorage.getItem('purchasingCharacterId');
                
                console.log('🔍 キャラクター購入情報:', {
                  savedCharacterName,
                  savedCharacterId,
                  metadataCharacterId: latestPurchase.metadata?.characterId,
                  latestPurchase
                });
                
                // metadata.characterIdまたはlocalStorageからcharacterIdを取得
                const characterId = latestPurchase.metadata?.characterId || savedCharacterId;
                
                if (characterId) {
                  try {
                    const characterResponse = await fetch(`/api/v1/characters/${characterId}`, {
                      headers: getAuthHeadersSync()
                    });
                    
                    if (characterResponse.ok) {
                      const characterData = await characterResponse.json();
                      setPurchaseData({
                        type: 'character',
                        characterId: characterId,
                        characterName: characterData.name?.ja || characterData.name?.en || characterData.name || savedCharacterName || 'キャラクター',
                        newBalance: userData.tokenBalance
                      });
                      setProcessing(false);
                      // localStorageをクリーンアップ
                      localStorage.removeItem('purchasingCharacterName');
                      localStorage.removeItem('purchasingCharacterId');
                      return;
                    }
                  } catch (error) {
                    console.error('キャラクター情報の取得に失敗:', error);
                  }
                }
                
                // APIが失敗した場合のフォールバック
                if (savedCharacterName) {
                  setPurchaseData({
                    type: 'character',
                    characterId: characterId || '',
                    characterName: savedCharacterName,
                    newBalance: userData.tokenBalance
                  });
                  localStorage.removeItem('purchasingCharacterName');
                  localStorage.removeItem('purchasingCharacterId');
                  setProcessing(false);
                  return;
                }
              }
              
              // トークン購入またはキャラクター情報取得失敗の場合
              setPurchaseData({
                type: latestPurchase.type || 'token',
                addedTokens: latestPurchase.amount || latestPurchase.tokensPurchased,
                newBalance: userData.tokenBalance,
                characterId: latestPurchase.metadata?.characterId,
                characterName: latestPurchase.details || undefined
              });
              setProcessing(false);
              return;
            }
          }
        }
      } catch (error) {
        console.log('購入履歴の取得に失敗:', error);
      }
      
      // フォールバック: 購入履歴が取得できない場合
      console.log('⚠️ 購入履歴が取得できないため、残高のみ表示');
      setPurchaseData({
        type: 'token',
        addedTokens: 0, // 購入履歴から取得できない場合は0
        newBalance: userData.tokenBalance
      });
      setProcessing(false);
      
    } catch (error) {
      console.error('購入処理エラー:', error);
      setProcessing(false);
    }
  };

  const handleBackToChat = () => {
    // ローカルストレージから保存された情報を取得
    const returnToCharacterId = localStorage.getItem('returnToCharacterId');
    const returnLocale = localStorage.getItem('returnToLocale') || 'ja';
    
    // キャラクター購入の場合、購入完了フラグを設定してデータ再取得を促す
    if (purchaseData?.type === 'character') {
      localStorage.setItem('characterPurchaseCompleted', 'true');
      localStorage.setItem('purchasedCharacterId', purchaseData.characterId || '');
    }
    
    if (purchaseData?.type === 'character' && purchaseData.characterId) {
      // キャラクター購入の場合は、購入したキャラクターのチャット画面へ
      router.push(`/${returnLocale}/characters/${purchaseData.characterId}/chat`);
    } else if (returnToCharacterId) {
      // 保存されたキャラクターIDに戻る
      localStorage.removeItem('returnToCharacterId');
      localStorage.removeItem('returnToLocale');
      router.push(`/${returnLocale}/characters/${returnToCharacterId}/chat`);
    } else {
      // フォールバック: キャラクター一覧画面
      router.push('/ja/characters');
    }
  };

  const handleBackToCharacterList = () => {
    // キャラクター一覧に戻る場合、購入完了フラグを設定
    localStorage.setItem('purchaseCompleted', 'true');
    router.push('/ja/characters');
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
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
                  キャラクターの購入が完了しました。
                </p>
                
                <div className="bg-purple-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <span className="text-2xl">🎭</span>
                    <span className="font-semibold text-purple-800">
                      新しいキャラクター
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
                    <span>キャラクターとチャットする</span>
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
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              エラーが発生しました
            </h2>
            <p className="text-gray-600 mb-6">
              購入処理中にエラーが発生しました。<br />
              お手数ですが、もう一度お試しください。
            </p>
            <button
              onClick={() => router.push('/ja/characters')}
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              キャラクター一覧に戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <PurchaseSuccessContent />
    </Suspense>
  );
}