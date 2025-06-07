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
    <div className="flex flex-col min-h-screen">
        {/* ヘッダー */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-400 mt-1">
                Monitor and manage your system overview
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 検索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
              
              {/* 通知 */}
              <button className="relative p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              {/* 設定 */}
              <button className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
                <Settings className="w-5 h-5" />
              </button>
              
              {/* プロファイル */}
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white text-sm font-semibold">A</span>
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
              
              {/* スクロールテスト用の追加コンテンツ */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">スクロールテスト用コンテンツ</h3>
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="py-2 border-b border-gray-100 last:border-b-0">
                    <p className="text-gray-600">テストコンテンツ {i + 1} - サイドバーが固定されているかスクロールして確認してください</p>
                  </div>
                ))}
              </div>
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