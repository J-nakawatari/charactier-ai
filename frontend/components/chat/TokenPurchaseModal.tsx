'use client';

import { useState, useEffect } from 'react';
import { X, Coins, Zap, CreditCard, Loader2 } from 'lucide-react';
import { getCurrentUser } from '@/utils/auth';

interface TokenPack {
  _id: string;
  name: string;
  description: string;
  tokens: number;
  price: number;
  priceId: string;
  profitMargin?: number;
  tokenPerYen?: number;
}

interface TokenPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTokens: number;
  onPurchaseSuccess?: (newTokens: number) => void;
}

export function TokenPurchaseModal({ 
  isOpen, 
  onClose, 
  currentTokens,
  onPurchaseSuccess 
}: TokenPurchaseModalProps) {
  const [tokenPacks, setTokenPacks] = useState<TokenPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<TokenPack | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTokenPacks();
    }
  }, [isOpen]);

  const fetchTokenPacks = async () => {
    try {
      setLoading(true);
      
      // 認証ヘッダーを取得
      const token = localStorage.getItem('accessToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/token-packs?isActive=true', {
        headers
      });
      
      if (!response.ok) throw new Error('Failed to fetch token packs');
      
      const data = await response.json();
      setTokenPacks(data.tokenPacks || []);
    } catch (error) {
      console.error('Failed to fetch token packs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pack: TokenPack) => {
    try {
      setPurchasing(true);
      setSelectedPack(pack);

      console.log('🛒 購入開始:', pack.name, pack.priceId);

      // Stripe Checkout Session作成
      const response = await fetch('/api/purchase/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priceId: pack.priceId,
          userId: getCurrentUser().id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'チェックアウトセッションの作成に失敗しました');
      }

      const { sessionId, url } = await response.json();
      
      console.log('✅ Checkout Session 作成完了:', { sessionId, url });

      // Stripeの決済画面にリダイレクト
      window.location.href = url;
      
    } catch (error) {
      console.error('Purchase failed:', error);
      alert(`購入処理でエラーが発生しました: ${(error as Error).message}`);
    } finally {
      setPurchasing(false);
      setSelectedPack(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Coins className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">トークチケット購入</h2>
              <p className="text-sm text-gray-500">現在の残高: {currentTokens.toLocaleString()}枚</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600">読み込み中...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm mb-6">
                チャットを続けるためのトークチケットを購入できます。
              </p>
              
              {tokenPacks.map((pack) => (
                <div
                  key={pack._id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{pack.name}</h3>
                        {pack.profitMargin && pack.profitMargin >= 50 && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            人気
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{pack.description}</p>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center text-purple-600">
                          <Coins className="w-4 h-4 mr-1" />
                          <span className="font-medium">{pack.tokens.toLocaleString()}枚</span>
                        </div>
                        {pack.tokenPerYen && (
                          <div className="flex items-center text-gray-500">
                            <Zap className="w-4 h-4 mr-1" />
                            <span>{pack.tokenPerYen.toFixed(1)}枚/円</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-gray-900 mb-2">
                        ¥{pack.price.toLocaleString()}
                      </div>
                      <button
                        onClick={() => handlePurchase(pack)}
                        disabled={purchasing}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {purchasing && selectedPack?._id === pack._id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>処理中...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            <span>購入する</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {tokenPacks.length === 0 && (
                <div className="text-center py-12">
                  <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">現在利用可能なトークンパックがありません</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>安全な決済処理により保護されています</span>
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4" />
              <span>Stripe決済</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}