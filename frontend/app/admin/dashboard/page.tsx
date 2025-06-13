'use client';

import { useState, useEffect } from 'react';
import StatsCards from '@/components/admin/StatsCards';
import UserChart from '@/components/admin/UserChart';
import TokenChart from '@/components/admin/TokenChart';
import NotificationList from '@/components/admin/NotificationList';
import SecurityAlerts from '@/components/admin/SecurityAlerts';
import QuickStats from '@/components/admin/QuickStats';
import CharacterTable from '@/components/admin/CharacterTable';
import type { DashboardStats, UserStats, TokenUsage, Character, SecurityEvent, Notification } from '@/types/common';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API calls
        // const [statsRes, userRes, tokenRes, notifRes, securityRes, charRes] = await Promise.all([
        //   fetch('/api/admin/stats'),
        //   fetch('/api/admin/user-stats'),
        //   fetch('/api/admin/token-usage'),
        //   fetch('/api/admin/notifications'),
        //   fetch('/api/admin/security-events'),
        //   fetch('/api/admin/characters')
        // ]);
        
        // For now, using empty data until APIs are implemented
        setDashboardStats({
          totalUsers: 0,
          activeUsers: 0,
          totalTokensUsed: 0,
          totalCharacters: 0,
          apiErrors: 0
        });
        setUserStats([]);
        setTokenUsage([]);
        setNotifications([]);
        setSecurityEvents([]);
        setCharacters([]);
      } catch (err) {
        setError('ダッシュボードデータの読み込みに失敗しました');
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ダッシュボードを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
        {/* ダッシュボードコンテンツ */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* ページタイトル */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
              <p className="text-sm text-gray-500 mt-1">
                システム全体の状況を監視・管理できます
              </p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
              {/* 左エリア - メインコンテンツ */}
              <div className="xl:col-span-3 space-y-4 md:space-y-6">
                {/* 統計カード */}
                {dashboardStats && <StatsCards stats={dashboardStats} />}
                
                {/* チャートエリア */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  <UserChart data={userStats} />
                  <TokenChart data={tokenUsage} />
                </div>
                
                {/* キャラクターテーブル */}
                <CharacterTable characters={characters} />
              </div>
              
              {/* 右エリア - サイドウィジェット */}
              <div className="xl:col-span-1 space-y-4 md:space-y-6">
                {/* セキュリティアラート */}
                <SecurityAlerts events={securityEvents} />
                
                {/* 通知リスト */}
                <NotificationList notifications={notifications} />
                
                {/* クイック統計 */}
                <QuickStats />
              </div>
            </div>
          </div>
        </main>
    </div>
  );
}