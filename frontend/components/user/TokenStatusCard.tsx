'use client';

import React from 'react';
import { Coins, TrendingDown, AlertTriangle } from 'lucide-react';

interface TokenStatusCardProps {
  balance: number;
  totalPurchased: number;
  recentUsage: Array<{ date: string; amount: number }>;
  isLowWarning?: boolean;
}

export default function TokenStatusCard({ 
  balance, 
  totalPurchased, 
  recentUsage, 
  isLowWarning = false 
}: TokenStatusCardProps) {
  
  const usagePercentage = totalPurchased > 0 ? ((totalPurchased - balance) / totalPurchased) * 100 : 0;
  const remainingPercentage = 100 - usagePercentage;
  
  // 直近7日間の平均使用量
  const averageDailyUsage = recentUsage.length > 0 
    ? recentUsage.reduce((sum, item) => sum + item.amount, 0) / recentUsage.length 
    : 0;
  
  // 予想残り日数
  const estimatedDaysLeft = averageDailyUsage > 0 ? Math.floor(balance / averageDailyUsage) : 0;

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
            トークン残高
          </h3>
        </div>
        
        {isLowWarning && (
          <div className="flex items-center space-x-1 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">残量警告</span>
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
          <span className="text-gray-500 text-sm">トークン</span>
        </div>
        
        {/* 残量率バー */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>残量</span>
            <span>{remainingPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isLowWarning ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
              style={{ width: `${remainingPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">総購入数</span>
          <span className="font-medium text-gray-900">
            {totalPurchased.toLocaleString()}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">使用済み</span>
          <span className="font-medium text-gray-900">
            {(totalPurchased - balance).toLocaleString()}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">日平均使用量</span>
          <div className="flex items-center space-x-1">
            <TrendingDown className="w-3 h-3 text-gray-400" />
            <span className="font-medium text-gray-900">
              {Math.round(averageDailyUsage).toLocaleString()}
            </span>
          </div>
        </div>

        {estimatedDaysLeft > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">予想残り日数</span>
            <span className={`font-medium ${
              isLowWarning ? 'text-red-600' : 'text-gray-900'
            }`}>
              約{estimatedDaysLeft}日
            </span>
          </div>
        )}
      </div>

      {/* 警告メッセージ */}
      {isLowWarning && (
        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">
                トークン残量が少なくなっています
              </p>
              <p className="text-xs text-red-600 mt-1">
                継続してチャットを楽しむために、トークンの補充をお忘れなく！
              </p>
            </div>
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="mt-4">
        <button className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
          isLowWarning 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}>
          {isLowWarning ? 'トークンを補充する' : 'トークンを購入'}
        </button>
      </div>
    </div>
  );
}