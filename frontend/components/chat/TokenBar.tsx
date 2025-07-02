'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Coins, AlertTriangle, Plus, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getAuthHeadersSync, getCurrentUser } from '@/utils/auth';

interface TokenBarProps {
  lastMessageCost: number;
  onPurchaseClick?: () => void;
  onTokenUpdate?: (newTokens: number) => void;
}

export function TokenBar({ lastMessageCost, onPurchaseClick, onTokenUpdate }: TokenBarProps) {
  const t = useTranslations('tokens');
  const [currentTokens, setCurrentTokens] = useState<number | null>(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const refreshTokenBalanceRef = useRef<() => Promise<void>>();
  const isRefreshingRef = useRef(false);
  const errorCountRef = useRef(0);
  const lastErrorTimeRef = useRef<number>(0);

  // トークン残高の手動更新
  const refreshTokenBalance = useCallback(async () => {
    if (isRefreshingRef.current) return;
    
    // エラーが5回以上の場合はリトライを停止
    if (errorCountRef.current >= 5) return;
    
    // 最後のエラーから5分経過していない場合はスキップ
    const now = Date.now();
    if (lastErrorTimeRef.current && now - lastErrorTimeRef.current < 300000) return;
    
    try {
      isRefreshingRef.current = true;
      // APIを再度有効化
      const response = await fetch('/api/v1/user/profile');
      if (response.ok) {
        const data = await response.json();
        // Handle different API response structures
        const newTokens = data.user?.tokenBalance || data.userState?.tokenBalance || data.tokenBalance || 0;
        console.log('TokenBar - API response:', { data, newTokens });
        setCurrentTokens(newTokens);
        onTokenUpdate?.(newTokens);
        errorCountRef.current = 0; // 成功したらエラーカウントをリセット
        lastErrorTimeRef.current = 0; // エラー時刻もリセット
      } else {
        // エラー時はlocalStorageから取得
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          const newTokens = userData.tokenBalance || 0;
          setCurrentTokens(newTokens);
          onTokenUpdate?.(newTokens);
        }
      }
    } catch (error) {
      console.error('Token balance refresh failed:', error);
      errorCountRef.current += 1;
      lastErrorTimeRef.current = now;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [onTokenUpdate]);

  // ref＆最新の関数を保持
  refreshTokenBalanceRef.current = refreshTokenBalance;

  // 初期ロード時に実際の残高を取得
  useEffect(() => {
    refreshTokenBalance();
  }, [refreshTokenBalance]); // 初回マウント時に実行
  
  // ページのフォーカス時に自動更新
  useEffect(() => {
    // 購入完了イベントがあるため、フォーカスイベントは不要
    
    const intervalHandler = () => {
      if (refreshTokenBalanceRef.current) {
        refreshTokenBalanceRef.current();
      }
    };
    
    // フォーカス/表示イベントを削除（過剰なAPI呼び出しを防ぐ）
    
    // 定期的な更新（180秒間隔に延長してサーバー負荷を軽減）
    const interval = setInterval(intervalHandler, 180000);
    
    return () => {
      // イベントリスナーを削除
      clearInterval(interval);
    };
  }, []); // 依存関係を空にして無限ループを防止, 関数はrefで参照
  
  const isLowBalance = currentTokens !== null && currentTokens < 500;
  const isCriticalBalance = currentTokens !== null && currentTokens < 200;
  const isZeroBalance = currentTokens !== null && currentTokens === 0;
  
  // トークンが0の場合、自動的に購入を促す
  useEffect(() => {
    if (isZeroBalance && !isRefreshingRef.current) {
      // 3秒後に購入モーダルを表示
      const timer = setTimeout(() => {
        const event = new CustomEvent('showTokenPurchaseModal', {
          detail: { reason: 'zero_balance' }
        });
        window.dispatchEvent(event);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isZeroBalance]);
  
  // ローディング中の処理
  if (currentTokens === null) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
          <Coins className="w-4 h-4 text-gray-400 animate-pulse" />
          <div className="text-sm text-gray-500">{t('loading')}</div>
        </div>
      </div>
    );
  }
  
  // 最後のメッセージコストが0の場合は平均的なコスト(100トークン)を使用
  const estimatedMessageCost = lastMessageCost > 0 ? lastMessageCost : 100;
  const remainingMessages = Math.floor(currentTokens / estimatedMessageCost);
  
  // デバッグ用ログ (開発環境のみ)
  if (process.env.NODE_ENV === 'development') {
    console.log('TokenBar Debug:', {
      currentTokens,
      lastMessageCost,
      estimatedMessageCost,
      remainingMessages,
      calculation: `${currentTokens} / ${estimatedMessageCost} = ${remainingMessages}`
    });
  }

  return (
    <div className="flex items-center space-x-2 sm:space-x-4">
      {/* トークン残量表示 */}
      <div className={`flex items-center space-x-1 sm:space-x-2 p-[0.7rem] rounded-lg ${
        isZeroBalance
          ? 'bg-red-100 border border-red-300 animate-pulse'
          : isCriticalBalance 
            ? 'bg-red-50 border border-red-200' 
            : isLowBalance 
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-white border border-gray-200'
      }`}>
        <Coins className={`w-3 sm:w-4 h-3 sm:h-4 ${
          isZeroBalance
            ? 'text-red-600 animate-pulse'
            : isCriticalBalance 
              ? 'text-red-500' 
              : isLowBalance 
                ? 'text-yellow-500'
                : 'text-purple-500'
        }`} />
        
        <div className="text-right relative">
          <div className={`text-xs sm:text-sm font-semibold ${
            isCriticalBalance 
              ? 'text-red-700' 
              : isLowBalance 
                ? 'text-yellow-700'
                : 'text-gray-700'
          }`}>
            <span>
              {currentTokens.toLocaleString()}{t('tokenUnit')}
            </span>
            <span className="hidden sm:inline">
              {isZeroBalance 
                ? t('noTokensLeft') 
                : t('remainingMessages', { count: remainingMessages })}
            </span>
          </div>
        </div>
        
        {/* 情報アイコンとツールチップ - デスクトップのみ表示 */}
        <div className="relative hidden sm:block">
          <button
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
          >
            <Info className="w-4 h-4 text-gray-400" />
          </button>
          
          {showTooltip && (
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg z-50">
              <div className="mb-2 font-semibold">トークン消費の仕組み</div>
              <div className="space-y-1 text-gray-300">
                <p>• 1メッセージ = 約{estimatedMessageCost}トークン</p>
                <p>• キャラクターの設定や会話履歴により変動</p>
                <p>• 長い会話ほど多くのトークンを消費</p>
                {lastMessageCost > 0 && (
                  <p className="mt-2 pt-2 border-t border-gray-700">
                    前回の消費: {lastMessageCost}トークン
                  </p>
                )}
              </div>
              <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-0 h-0 
                border-t-[6px] border-t-transparent
                border-b-[6px] border-b-transparent
                border-r-[6px] border-r-gray-900">
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 警告アイコン（残量少ない時） - デスクトップのみ表示 */}
      {isLowBalance && (
        <div className="hidden sm:flex items-center">
          <AlertTriangle className={`w-5 h-5 ${
            isCriticalBalance ? 'text-red-500 animate-pulse' : 'text-yellow-500'
          }`} />
        </div>
      )}

      {/* チャージボタン */}
      <button 
        className={`flex items-center space-x-1 sm:space-x-2 p-[0.7rem] rounded-lg text-sm font-medium transition-colors ${
          isCriticalBalance
            ? 'bg-red-600 text-white hover:bg-red-700'
            : isLowBalance
              ? 'bg-yellow-600 text-white hover:bg-yellow-700'
              : 'bg-purple-600 text-white hover:bg-purple-700'
        }`}
        onClick={() => {
          onPurchaseClick?.();
        }}
      >
        <Plus className="w-3 sm:w-4 h-3 sm:h-4" />
        <span className="text-xs sm:text-sm">{t('purchase')}</span>
      </button>

    </div>
  );
}