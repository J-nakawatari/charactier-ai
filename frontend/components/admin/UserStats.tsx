'use client';

// import { UserData } from '@/mock/adminData'; // モックデータは使用しない

interface UserData {
  id: string;
  _id: string;
  name: string;
  email: string;
  tokenBalance: number;
  totalSpent: number;
  chatCount: number;
  avgIntimacy: number;
  lastLogin: string;
  status: string;
  isTrialUser: boolean;
  createdAt: string;
}
import { Users, UserCheck, UserX, DollarSign } from 'lucide-react';

interface UserStatsProps {
  users: UserData[];
}

export default function UserStats({ users }: UserStatsProps) {
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    trial: users.filter(u => u.isTrialUser).length,
    totalRevenue: users.reduce((sum, u) => sum + u.totalSpent, 0),
    avgSpent: users.reduce((sum, u) => sum + u.totalSpent, 0) / users.length
  };

  const cards = [
    {
      title: '総ユーザー数',
      value: stats.total.toLocaleString(),
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'アクティブユーザー',
      value: stats.active.toLocaleString(),
      icon: UserCheck,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: '非アクティブ',
      value: stats.inactive.toLocaleString(),
      icon: UserX,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    {
      title: '総売上',
      value: `¥${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
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