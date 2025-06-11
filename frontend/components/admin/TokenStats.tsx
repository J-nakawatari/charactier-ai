'use client';

import { CreditCard, TrendingUp, Users, DollarSign } from 'lucide-react';

interface TokenUsage {
  date: string;
  tokensUsed: number;
  revenue: number;
}

interface UserData {
  _id: string;
  tokenBalance: number;
  totalSpent: number;
}

interface TokenStatsProps {
  tokenUsage: TokenUsage[];
  users: UserData[];
}

export default function TokenStats({ tokenUsage, users }: TokenStatsProps) {
  const latestUsage = tokenUsage[tokenUsage.length - 1];
  const totalRevenue = tokenUsage.reduce((sum, usage) => sum + usage.revenue, 0);
  const totalTokensUsed = tokenUsage.reduce((sum, usage) => sum + usage.tokensUsed, 0);
  const totalTokenBalance = users.reduce((sum, user) => sum + user.tokenBalance, 0);
  const totalSpent = users.reduce((sum, user) => sum + user.totalSpent, 0);
  const avgRevenuePerDay = totalRevenue / tokenUsage.length;

  const cards = [
    {
      title: '今日のトークン使用',
      value: latestUsage?.tokensUsed.toLocaleString() || '0',
      icon: CreditCard,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: '今日の売上',
      value: `¥${latestUsage?.revenue.toLocaleString() || '0'}`,
      icon: DollarSign,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: '総トークン残高',
      value: totalTokenBalance.toLocaleString(),
      icon: TrendingUp,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: '平均日次売上',
      value: `¥${Math.round(avgRevenuePerDay).toLocaleString()}`,
      icon: Users,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={`${card.color} p-3 rounded-lg`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{card.title}</p>
              <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}