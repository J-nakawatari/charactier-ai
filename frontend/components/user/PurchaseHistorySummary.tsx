'use client';

import React, { useState } from 'react';
import { ShoppingCart, Coins, Users, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface PurchaseHistoryItem {
  type: 'token' | 'character';
  amount: number;
  date: Date;
  details: string;
}

interface PurchaseHistorySummaryProps {
  purchaseHistory: PurchaseHistoryItem[];
  locale: string;
}

export default function PurchaseHistorySummary({ purchaseHistory, locale }: PurchaseHistorySummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 最新3件を表示（展開時は全件）
  const displayItems = isExpanded ? (purchaseHistory || []) : (purchaseHistory || []).slice(0, 3);
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAmount = (amount: number, type: string) => {
    if (type === 'token') {
      return `${amount.toLocaleString()}トークン`;
    } else {
      return `¥${amount.toLocaleString()}`;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'token' ? (
      <Coins className="w-4 h-4 text-yellow-500" />
    ) : (
      <Users className="w-4 h-4 text-purple-500" />
    );
  };

  const getTypeColor = (type: string) => {
    return type === 'token' ? 'bg-yellow-100 text-yellow-800' : 'bg-purple-100 text-purple-800';
  };

  // 統計計算
  const totalSpent = (purchaseHistory || []).reduce((sum, item) => {
    return sum + (item.type === 'character' ? item.amount : 0);
  }, 0);
  
  const totalTokensPurchased = (purchaseHistory || []).reduce((sum, item) => {
    return sum + (item.type === 'token' ? item.amount : 0);
  }, 0);

  if ((purchaseHistory || []).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <ShoppingCart className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">購入履歴</h3>
        </div>
        <div className="text-center py-8">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-3">まだ購入履歴がありません</p>
          <button className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors">
            トークンを購入する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <ShoppingCart className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">購入履歴</h3>
        </div>
        
        {purchaseHistory.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-700 transition-colors"
          >
            <span>{isExpanded ? '閉じる' : 'すべて見る'}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* 統計サマリ */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-600">総購入額</p>
          <p className="text-lg font-bold text-gray-900">
            ¥{totalSpent.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">購入トークン</p>
          <p className="text-lg font-bold text-gray-900">
            {totalTokensPurchased.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 購入履歴リスト */}
      <div className="space-y-3">
        {displayItems.map((item, index) => (
          <div
            key={index}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {/* SP: 縦並び、PC: 横並び */}
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center space-x-3 min-w-0">
                {/* タイプアイコン */}
                <div className="flex-shrink-0">
                  {getTypeIcon(item.type)}
                </div>
                
                {/* 購入詳細 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                      {item.type === 'token' ? 'トークン' : 'キャラクター'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium truncate">
                    {item.details}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(item.date)}</span>
                  </div>
                </div>
              </div>

              {/* 金額 - SP時は左寄せ、PC時は右寄せ */}
              <div className="text-left sm:text-right flex-shrink-0">
                <p className="text-sm font-medium text-gray-900">
                  {formatAmount(item.amount, item.type)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* フッター */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-3">
          <button className="py-2 px-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium">
            トークン購入
          </button>
          <button className="py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
            キャラクター購入
          </button>
        </div>
      </div>
    </div>
  );
}