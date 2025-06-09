'use client';

import { Coins, AlertTriangle, Plus } from 'lucide-react';

interface TokenBarProps {
  tokensRemaining: number;
  lastMessageCost: number;
}

export function TokenBar({ tokensRemaining, lastMessageCost }: TokenBarProps) {
  const isLowBalance = tokensRemaining < 500;
  const isCriticalBalance = tokensRemaining < 200;
  
  const remainingMessages = Math.floor(tokensRemaining / lastMessageCost);

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
            <span>{tokensRemaining.toLocaleString()}枚</span>
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
          // TODO: トークン購入ページへのナビゲーション
          console.log('Navigate to token purchase');
        }}
      >
        <Plus className="w-4 h-4" />
        <span className="sm:hidden text-xs">トークチケット購入</span>
        <span className="hidden sm:inline">トークチケット購入</span>
      </button>

    </div>
  );
}