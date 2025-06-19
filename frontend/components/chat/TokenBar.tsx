'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Coins, AlertTriangle, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getAuthHeaders, getCurrentUser } from '@/utils/auth';

interface TokenBarProps {
  lastMessageCost: number;
  onPurchaseClick?: () => void;
  onTokenUpdate?: (newTokens: number) => void;
}

export function TokenBar({ lastMessageCost, onPurchaseClick, onTokenUpdate }: TokenBarProps) {
  const t = useTranslations('tokens');
  const [currentTokens, setCurrentTokens] = useState<number | null>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [lastErrorTime, setLastErrorTime] = useState<number>(0);
  const refreshTokenBalanceRef = useRef<() => Promise<void>>();

  // トークン残高の手動更新
  const refreshTokenBalance = useCallback(async () => {
    if (isRefreshing) return;
    
    // エラーが5回以上の場合はリトライを停止
    if (errorCount >= 5) return;
    
    // 最後のエラーから5分経過していない場合はスキップ
    const now = Date.now();
    if (lastErrorTime && now - lastErrorTime < 300000) return;
    
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/user/profile', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const userData = await response.json();
        const newTokens = userData.tokenBalance || userData.user?.tokenBalance || 0;
        setCurrentTokens(newTokens);
        onTokenUpdate?.(newTokens);
        setErrorCount(0); // 成功したらエラーカウントをリセット
        setLastErrorTime(0); // エラー時刻もリセット
      } else {
        setErrorCount(prev => prev + 1);
        setLastErrorTime(now);
        console.warn(`Token balance API returned ${response.status}`);
      }
    } catch (error) {
      console.error('Token balance refresh failed:', error);
      setErrorCount(prev => prev + 1);
      setLastErrorTime(now);
    } finally {
      setIsRefreshing(false);
    }
  }, [onTokenUpdate, isRefreshing, errorCount, lastErrorTime]);

  // ref＆最新の関数を保持
  refreshTokenBalanceRef.current = refreshTokenBalance;

  // 初期ロード時に実際の残高を取得
  useEffect(() => {
    refreshTokenBalance();
  }, [refreshTokenBalance]);
  
  // ページのフォーカス時に自動更新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && refreshTokenBalanceRef.current) {
        refreshTokenBalanceRef.current();
      }
    };
    
    const handleFocus = () => {
      if (refreshTokenBalanceRef.current) {
        refreshTokenBalanceRef.current();
      }
    };
    
    const intervalHandler = () => {
      if (refreshTokenBalanceRef.current) {
        refreshTokenBalanceRef.current();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // 定期的な更新（60秒間隔、エラー時は自動的にスキップされる）
    const interval = setInterval(intervalHandler, 60000);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []); // 依存関係を空にして無限ループを防止, 関数はrefで参照
  
  const isLowBalance = currentTokens !== null && currentTokens < 500;
  const isCriticalBalance = currentTokens !== null && currentTokens < 200;
  const isZeroBalance = currentTokens !== null && currentTokens === 0;
  
  // トークンが0の場合、自動的に購入を促す
  useEffect(() => {
    if (isZeroBalance && !isRefreshing) {
      // 3秒後に購入モーダルを表示
      const timer = setTimeout(() => {
        const event = new CustomEvent('showTokenPurchaseModal', {
          detail: { reason: 'zero_balance' }
        });
        window.dispatchEvent(event);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isZeroBalance, isRefreshing]);
  
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

  return (
    <div className="flex items-center space-x-4">
      {/* トークン残量表示 */}
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
        isZeroBalance
          ? 'bg-red-100 border border-red-300 animate-pulse'
          : isCriticalBalance 
            ? 'bg-red-50 border border-red-200' 
            : isLowBalance 
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-white border border-gray-200'
      }`}>
        <Coins className={`w-4 h-4 ${
          isZeroBalance
            ? 'text-red-600 animate-pulse'
            : isCriticalBalance 
              ? 'text-red-500' 
              : isLowBalance 
                ? 'text-yellow-500'
                : 'text-purple-500'
        }`} />
        
        <div className="text-right">
          <div className={`text-sm font-semibold ${
            isCriticalBalance 
              ? 'text-red-700' 
              : isLowBalance 
                ? 'text-yellow-700'
                : 'text-gray-700'
          }`}>
            <span className={isRefreshing ? 'opacity-50' : ''}>
              {currentTokens.toLocaleString()}{t('tokenUnit')}
            </span>
            <span className="hidden sm:inline">
              {isZeroBalance 
                ? t('noTokensLeft') 
                : t('remainingMessages', { count: remainingMessages })}
            </span>
          </div>
        </div>
      </div>

      {/* 警告アイコン（残量少ない時） */}
      {isLowBalance && (
        <div className="flex items-center">
          <AlertTriangle className={`w-5 h-5 ${
            isCriticalBalance ? 'text-red-500 animate-pulse' : 'text-yellow-500'
          }`} />
        </div>
      )}

      {/* チャージボタン */}
      <button 
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
        <Plus className="w-4 h-4" />
        <span className="sm:hidden text-xs">{t('purchase')}</span>
        <span className="hidden sm:inline">{t('purchase')}</span>
      </button>

    </div>
  );
}