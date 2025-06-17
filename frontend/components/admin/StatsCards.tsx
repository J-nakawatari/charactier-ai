'use client';

import { Users, MessageSquare, Coins, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTokensUsed: number;
  totalCharacters: number;
  apiErrors: number;
  trends?: {
    userGrowth?: number;
    tokenUsageGrowth?: number;
    apiErrorTrend?: number;
    characterPopularity?: number;
  };
}

interface StatsCardsProps {
  stats: DashboardStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  // statsがundefinedの場合のデフォルト値
  const safeStats = stats || {
    totalUsers: 0,
    activeUsers: 0,
    totalTokensUsed: 0,
    totalCharacters: 0,
    apiErrors: 0
  };

  // トレンドデータの整形
  const formatTrend = (trend?: number) => {
    if (trend === undefined || trend === null) return '0%';
    const sign = trend >= 0 ? '+' : '';
    return `${sign}${trend}%`;
  };

  const cards = [
    {
      title: '総ユーザー数',
      value: safeStats.totalUsers.toLocaleString(),
      subValue: `アクティブ: ${safeStats.activeUsers.toLocaleString()}`,
      icon: Users,
      trend: formatTrend(safeStats.trends?.userGrowth),
      trendUp: (safeStats.trends?.userGrowth || 0) >= 0,
      color: 'bg-blue-500'
    },
    {
      title: 'トークン使用量',
      value: `${(safeStats.totalTokensUsed / 1000000).toFixed(1)}M`,
      subValue: '今月累計',
      icon: Coins,
      trend: formatTrend(safeStats.trends?.tokenUsageGrowth),
      trendUp: (safeStats.trends?.tokenUsageGrowth || 0) >= 0,
      color: 'bg-green-500'
    },
    {
      title: 'キャラクター数',
      value: safeStats.totalCharacters.toString(),
      subValue: 'アクティブ',
      icon: MessageSquare,
      trend: formatTrend(safeStats.trends?.characterPopularity),
      trendUp: (safeStats.trends?.characterPopularity || 0) >= 0,
      color: 'bg-purple-500'
    },
    {
      title: 'APIエラー',
      value: safeStats.apiErrors.toString(),
      subValue: '24時間',
      icon: AlertTriangle,
      trend: formatTrend(safeStats.trends?.apiErrorTrend),
      trendUp: false, // エラーは減少が良いので常にfalse
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <div className={`flex items-center space-x-1 text-sm ${
              card.trendUp ? 'text-green-600' : 'text-red-600'
            }`}>
              {card.trendUp ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{card.trend}</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
            <p className="text-sm text-gray-500">{card.title}</p>
            <p className="text-xs text-gray-400 mt-1">{card.subValue}</p>
          </div>
        </div>
      ))}
    </div>
  );
}