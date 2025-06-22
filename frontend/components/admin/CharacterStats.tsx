'use client';

import { MessageSquare, Heart, Users, DollarSign } from 'lucide-react';

interface Character {
  _id: string;
  name: { ja: string; en: string };
  description: { ja: string; en: string };
  personalityPreset: string;
  personalityTags: string[];
  characterAccessType: 'free' | 'purchaseOnly';
  isActive: boolean;
  imageCharacterSelect?: string;
  totalMessages?: number;
  totalUsers?: number;
  averageAffinityLevel?: number;
  createdAt: string;
  updatedAt: string;
}

interface CharacterStatsProps {
  characters: Character[];
}

export default function CharacterStats({ characters }: CharacterStatsProps) {
  const stats = {
    total: characters.length,
    active: characters.filter(c => c.isActive).length,
    free: characters.filter(c => c.characterAccessType === 'free').length,
    totalChats: characters.reduce((sum, c) => sum + (c.totalMessages || 0), 0),
    totalUsers: characters.reduce((sum, c) => sum + (c.totalUsers || 0), 0),
    avgIntimacy: characters.length > 0 ? characters.reduce((sum, c) => sum + (c.averageAffinityLevel || 0), 0) / characters.length : 0,
    premium: characters.filter(c => c.characterAccessType === 'purchaseOnly').length
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
      title: 'ベースキャラクター',
      value: stats.free.toLocaleString(),
      icon: Heart,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: '総メッセージ数',
      value: stats.totalChats.toLocaleString(),
      icon: MessageSquare,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    {
      title: '総ユーザー数',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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