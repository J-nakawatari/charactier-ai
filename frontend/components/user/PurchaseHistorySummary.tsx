'use client';

import React, { useState } from 'react';
import { ShoppingCart, Coins, Users, Calendar, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface PurchaseHistoryItem {
  type: 'token' | 'character';
  amount: number;
  price: number;
  date: Date;
  details: string;
  status?: string;
}

interface PurchaseHistorySummaryProps {
  purchaseHistory: PurchaseHistoryItem[];
  locale: string;
}

export default function PurchaseHistorySummary({ purchaseHistory, locale }: PurchaseHistorySummaryProps) {
  const t = useTranslations('purchaseHistorySummary');
  const tGeneral = useTranslations('general');
  
  // デバッグ: 購入履歴データを確認
  console.log('PurchaseHistorySummary - purchaseHistory:', purchaseHistory);
  
  // 最新3件のみ表示
  const displayItems = (purchaseHistory || []).slice(0, 3);
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAmount = (item: PurchaseHistoryItem) => {
    // トークン購入の場合は、トークン数と金額の両方を表示
    if (item.type === 'token') {
      return (
        <>
          <span className="block">{t('types.token', { amount: item.amount.toLocaleString() })}</span>
          <span className="text-xs text-gray-500">¥{item.price.toLocaleString()}</span>
        </>
      );
    } else {
      return `¥${item.price.toLocaleString()}`;
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
    return sum + (item.price || 0);
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
          <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
        </div>
        <div className="text-center py-8">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('noHistory')}</p>
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
          <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
        </div>
        
        {purchaseHistory.length > 3 && (
          <Link
            href={`/${locale}/purchase-history`}
            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>{tGeneral('viewAll')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* 統計サマリ */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-600">{t('totalSpent')}</p>
          <p className="text-lg font-bold text-gray-900">
            ¥{totalSpent.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">{t('purchasedTokens')}</p>
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
{item.type === 'token' ? t('types.tokenUnit') : t('types.characterUnit')}
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
                <div className="text-sm font-medium text-gray-900">
                  {formatAmount(item)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}