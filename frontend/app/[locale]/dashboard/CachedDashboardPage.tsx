'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useUserDashboard } from '@/hooks/useDashboardData';
import Link from 'next/link';
import Image from 'next/image';
import UserSidebar from '@/components/user/UserSidebar';
import dynamic from 'next/dynamic';

// Lucideアイコンの動的インポート（バンドルサイズ削減）
const Heart = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Heart })), {
  loading: () => <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
});
const MessageSquare = dynamic(() => import('lucide-react').then(mod => ({ default: mod.MessageSquare })), {
  loading: () => <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
});
const Coins = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Coins })), {
  loading: () => <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
});
const Users = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Users })), {
  loading: () => <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
});

interface DashboardPageProps {
  locale: string;
}

export default function CachedDashboardPage({ locale }: DashboardPageProps) {
  const t = useTranslations('dashboard');
  const { data, error, isLoading, isValidating, refresh } = useUserDashboard();

  // エラー表示
  if (error && !data) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-purple-50 to-pink-50">
        <UserSidebar locale={locale} />
        <div className="lg:ml-64 flex items-center justify-center min-h-dvh">
          <div className="text-center">
            <p className="text-red-500 mb-4">データの読み込みに失敗しました</p>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  // データがまだない場合のローディング表示（初回のみ）
  if (isLoading && !data) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-purple-50 to-pink-50">
        <UserSidebar locale={locale} />
        <div className="lg:ml-64 flex items-center justify-center min-h-dvh">
          <div className="animate-pulse text-center">
            <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto mb-4"></div>
            <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // データがある場合は表示（バックグラウンドで更新中でも表示）
  const { user, recentChats = [], affinityProgress = [] } = data || {};

  return (
    <div className="min-h-dvh bg-gradient-to-br from-purple-50 to-pink-50">
      <UserSidebar locale={locale} />
      
      <div className="lg:ml-64">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* バックグラウンド更新中の表示 */}
          {isValidating && (
            <div className="mb-4 flex items-center justify-center">
              <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
                <span className="text-sm text-gray-600">データを更新中...</span>
              </div>
            </div>
          )}

          {/* ヘッダー部分 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('welcome', { name: user?.name || 'ユーザー' })}
            </h1>
            <p className="text-gray-600">{t('subtitle')}</p>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<Coins className="w-6 h-6" />}
              title={t('stats.tokens')}
              value={user?.tokenBalance || 0}
              color="purple"
            />
            <StatCard
              icon={<MessageSquare className="w-6 h-6" />}
              title={t('stats.totalChats')}
              value={user?.totalChats || 0}
              color="blue"
            />
            <StatCard
              icon={<Users className="w-6 h-6" />}
              title={t('stats.characters')}
              value={user?.purchasedCharacters?.length || 0}
              color="green"
            />
            <StatCard
              icon={<Heart className="w-6 h-6" />}
              title={t('stats.maxAffinity')}
              value={Math.max(...(affinityProgress.map((a: any) => a.level) || [0]))}
              color="pink"
            />
          </div>

          {/* 最近のチャット */}
          <RecentChatsSection 
            chats={recentChats} 
            locale={locale}
            title={t('recentChats.title')}
            emptyMessage={t('recentChats.empty')}
          />

          {/* 親密度進捗 */}
          <AffinityProgressSection 
            affinities={affinityProgress}
            locale={locale}
            title={t('affinity.title')}
            emptyMessage={t('affinity.empty')}
          />
        </div>
      </div>
    </div>
  );
}

// 統計カードコンポーネント
function StatCard({ icon, title, value, color }: {
  icon: React.ReactNode;
  title: string;
  value: number;
  color: 'purple' | 'blue' | 'green' | 'pink';
}) {
  const colorClasses = {
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    pink: 'bg-pink-100 text-pink-700'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className={`inline-flex p-3 rounded-lg ${colorClasses[color]} mb-4`}>
        {icon}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  );
}

// 最近のチャットセクション
function RecentChatsSection({ chats, locale, title, emptyMessage }: {
  chats: any[];
  locale: string;
  title: string;
  emptyMessage: string;
}) {
  if (!chats || chats.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
        <p className="text-gray-500 text-center py-8">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-3">
        {chats.map((chat: any) => (
          <Link
            key={chat._id}
            href={`/${locale}/characters/${chat.character._id}/chat`}
            className="block p-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <Image
                src={chat.character.imageCharacterSelect || '/uploads/placeholder.png'}
                alt={chat.character.name}
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{chat.character.name}</h3>
                <p className="text-sm text-gray-500">{chat.lastMessage}</p>
              </div>
              <div className="text-xs text-gray-400">
                {new Date(chat.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// 親密度進捗セクション
function AffinityProgressSection({ affinities, locale, title, emptyMessage }: {
  affinities: any[];
  locale: string;
  title: string;
  emptyMessage: string;
}) {
  if (!affinities || affinities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
        <p className="text-gray-500 text-center py-8">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-4">
        {affinities.map((affinity: any) => (
          <div key={affinity.character._id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Image
                  src={affinity.character.imageCharacterSelect || '/uploads/placeholder.png'}
                  alt={affinity.character.name}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
                <span className="font-medium text-gray-900">{affinity.character.name}</span>
              </div>
              <span className="text-sm font-medium text-purple-600">
                Lv.{affinity.level}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(affinity.level % 10) * 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}