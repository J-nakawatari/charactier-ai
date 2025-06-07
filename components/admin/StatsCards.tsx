'use client';

import { Users, MessageSquare, Coins, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { DashboardStats } from '@/mock/adminData';

interface StatsCardsProps {
  stats: DashboardStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: '総ユーザー数',
      value: stats.totalUsers.toLocaleString(),
      subValue: `アクティブ: ${stats.activeUsers.toLocaleString()}`,
      icon: Users,
      trend: '+12%',
      trendUp: true,
      color: 'bg-blue-500'
    },
    {
      title: 'トークン使用量',
      value: `${(stats.totalTokensUsed / 1000000).toFixed(1)}M`,
      subValue: '今月累計',
      icon: Coins,
      trend: '+8.5%',
      trendUp: true,
      color: 'bg-green-500'
    },
    {
      title: 'キャラクター数',
      value: stats.totalCharacters.toString(),
      subValue: 'アクティブ',
      icon: MessageSquare,
      trend: '+2',
      trendUp: true,
      color: 'bg-purple-500'
    },
    {
      title: 'APIエラー',
      value: stats.apiErrors.toString(),
      subValue: '24時間',
      icon: AlertTriangle,
      trend: '-15%',
      trendUp: false,
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