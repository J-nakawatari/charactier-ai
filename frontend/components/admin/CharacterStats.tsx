'use client';

import { CharacterData } from '@/mock/adminData';
import { MessageSquare, Heart, Users, DollarSign } from 'lucide-react';

interface CharacterStatsProps {
  characters: CharacterData[];
}

export default function CharacterStats({ characters }: CharacterStatsProps) {
  const stats = {
    total: characters.length,
    active: characters.filter(c => c.isActive).length,
    free: characters.filter(c => c.isFree).length,
    totalChats: characters.reduce((sum, c) => sum + c.totalChats, 0),
    avgIntimacy: characters.reduce((sum, c) => sum + c.avgIntimacy, 0) / characters.length,
    totalRevenue: characters.filter(c => !c.isFree).reduce((sum, c) => sum + (c.price * 10), 0) // 推定売上
  };

  const cards = [
    {
      title: '総キャラクター数',
      value: stats.total.toLocaleString(),
      icon: MessageSquare,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'アクティブ',
      value: stats.active.toLocaleString(),
      icon: Users,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: '平均親密度',
      value: `${stats.avgIntimacy.toFixed(1)}%`,
      icon: Heart,
      color: 'bg-pink-500',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-700'
    },
    {
      title: '総チャット数',
      value: stats.totalChats.toLocaleString(),
      icon: MessageSquare,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
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