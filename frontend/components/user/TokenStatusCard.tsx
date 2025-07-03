'use client';

import React, { useState } from 'react';
import { Coins, TrendingDown, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TokenPurchaseModal } from '../chat/TokenPurchaseModal';

interface TokenStatusCardProps {
  balance: number;
  totalPurchased: number;
  recentUsage: Array<{ date: string; amount: number }>;
  onTokensUpdated?: (newBalance: number) => void;
}

export default function TokenStatusCard({ 
  balance, 
  totalPurchased, 
  recentUsage, 
  onTokensUpdated
}: TokenStatusCardProps) {
  const t = useTranslations('tokens');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  
  const usagePercentage = totalPurchased > 0 ? ((totalPurchased - balance) / totalPurchased) * 100 : 0;
  const remainingPercentage = 100 - usagePercentage;
  
  // 低残高警告の判定
  const isLowWarning = totalPurchased > 0 && balance <= (totalPurchased * 0.2);
  
  // 直近7日間の平均使用量
  const averageDailyUsage = (recentUsage || []).length > 0 
    ? (recentUsage || []).reduce((sum, item) => sum + item.amount, 0) / (recentUsage || []).length 
    : 0;
  
  // 予想残り日数
  const estimatedDaysLeft = averageDailyUsage > 0 ? Math.floor(balance / averageDailyUsage) : 0;

  const handlePurchaseSuccess = (newTokens: number) => {
    if (onTokensUpdated) {
      onTokensUpdated(newTokens);
    }
    setShowPurchaseModal(false);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${
      isLowWarning ? 'border-red-200 bg-red-50' : 'border-gray-200'
    }`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg ${
            isLowWarning ? 'bg-red-100' : 'bg-purple-100'
          }`}>
            <Coins className={`w-5 h-5 ${
              isLowWarning ? 'text-red-600' : 'text-purple-600'
            }`} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('balance')}
          </h3>
        </div>
        
        {isLowWarning && (
          <div className="flex items-center space-x-1 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">{t('lowBalanceWarning')}</span>
          </div>
        )}
      </div>

      {/* メイン数値 */}
      <div className="mb-4">
        <div className="flex items-baseline space-x-2">
          <span className={`text-3xl font-bold ${
            isLowWarning ? 'text-red-600' : 'text-gray-900'
          }`}>
            {balance.toLocaleString()}
          </span>
          <span className="text-gray-500 text-sm">{t('unit')}</span>
        </div>
      </div>


      {/* 警告メッセージ */}
      {isLowWarning && (
        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">
                {t('lowBalanceTitle')}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {t('lowBalanceDesc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="mt-4">
        <button 
          onClick={() => setShowPurchaseModal(true)}
          className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
            isLowWarning 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
{isLowWarning ? t('refill') : t('buy')}
        </button>
      </div>

      {/* トークン購入モーダル */}
      <TokenPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        currentTokens={balance}
        onPurchaseSuccess={handlePurchaseSuccess}
      />
    </div>
  );
}