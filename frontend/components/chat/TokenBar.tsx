'use client';

import { useEffect, useState } from 'react';
import { Coins, AlertTriangle, Plus } from 'lucide-react';
import { getAuthHeaders, getCurrentUser } from '@/utils/auth';

interface TokenBarProps {
  lastMessageCost: number;
  onPurchaseClick?: () => void;
  onTokenUpdate?: (newTokens: number) => void;
}

export function TokenBar({ lastMessageCost, onPurchaseClick, onTokenUpdate }: TokenBarProps) {
  const [currentTokens, setCurrentTokens] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 初期ロード時に実際の残高を取得
  useEffect(() => {
    refreshTokenBalance();
  }, []);
  
  // トークン残高の手動更新
  const refreshTokenBalance = async () => {
    if (isRefreshing) return;
    
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
      }
    } catch (error) {
      console.error('Token balance refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // ページのフォーカス時に自動更新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshTokenBalance();
      }
    };
    
    const handleFocus = () => {
      refreshTokenBalance();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // 定期的な更新（60秒間隔）
    const interval = setInterval(refreshTokenBalance, 60000);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);
  
  // ローディング中の処理
  if (currentTokens === null) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
          <Coins className="w-4 h-4 text-gray-400 animate-pulse" />
          <div className="text-sm text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }
  
  const isLowBalance = currentTokens < 500;
  const isCriticalBalance = currentTokens < 200;
  
  const remainingMessages = lastMessageCost > 0 ? Math.floor(currentTokens / lastMessageCost) : 0;

  return (
    <div className="flex items-center space-x-4">
      {/* トークン残量表示 */}
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
        isCriticalBalance 
          ? 'bg-red-50 border border-red-200' 
          : isLowBalance 
            ? 'bg-yellow-50 border border-yellow-200'
            : 'bg-white border border-gray-200'
      }`}>
        <Coins className={`w-4 h-4 ${
          isCriticalBalance 
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
              {currentTokens.toLocaleString()}枚
            </span>
            <span className="hidden sm:inline">（あと約{remainingMessages}メッセージ）</span>
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
        <span className="sm:hidden text-xs">トークチケット購入</span>
        <span className="hidden sm:inline">トークチケット購入</span>
      </button>

    </div>
  );
}