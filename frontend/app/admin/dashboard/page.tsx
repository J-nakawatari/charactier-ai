'use client';

import StatsCards from '@/components/admin/StatsCards';
import UserChart from '@/components/admin/UserChart';
import TokenChart from '@/components/admin/TokenChart';
import NotificationList from '@/components/admin/NotificationList';
import SecurityAlerts from '@/components/admin/SecurityAlerts';
import QuickStats from '@/components/admin/QuickStats';
import CharacterTable from '@/components/admin/CharacterTable';
import { Search, Bell, Settings } from 'lucide-react';
import {
  mockDashboardStats,
  mockUserStats,
  mockTokenUsage,
  mockNotifications,
  mockSecurityEvents,
  mockCharacters
} from '@/mock/adminData';

export default function AdminDashboard() {
  return (
    <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
              <p className="text-sm text-gray-500 mt-1">
                システム全体の状況を監視・管理できます
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 検索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="検索..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>
              
              {/* 通知 */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              {/* 設定 */}
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              
              {/* プロファイル */}
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">A</span>
              </div>
            </div>
          </div>
        </header>

        {/* ダッシュボードコンテンツ */}
        <main className="flex-1 p-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* 左エリア - メインコンテンツ */}
            <div className="xl:col-span-3 space-y-6">
              {/* 統計カード */}
              <StatsCards stats={mockDashboardStats} />
              
              {/* チャートエリア */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <UserChart data={mockUserStats} />
                <TokenChart data={mockTokenUsage} />
              </div>
              
              {/* キャラクターテーブル */}
              <CharacterTable characters={mockCharacters} />
            </div>
            
            {/* 右エリア - サイドウィジェット */}
            <div className="xl:col-span-1 space-y-6">
              {/* セキュリティアラート */}
              <SecurityAlerts events={mockSecurityEvents} />
              
              {/* 通知リスト */}
              <NotificationList notifications={mockNotifications} />
              
              {/* クイック統計 */}
              <QuickStats />
            </div>
          </div>
        </main>
    </div>
  );
}