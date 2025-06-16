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
        console.log('🚀 Admin Dashboard - データ取得開始');
        
        const token = localStorage.getItem('accessToken');
        console.log('🔑 Token exists:', !!token);
        
        if (!token) {
          throw new Error('認証トークンが見つかりません');
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        console.log('📡 Fetching data from APIs...');
        
        // 既存の管理者用APIエンドポイントを呼び出し
        const [overviewRes, charactersRes] = await Promise.all([
          fetch('/api/admin/token-analytics/overview', { headers }),
          fetch('/api/admin/characters', { headers })
        ]);
        
        console.log('📡 API responses received:', {
          overviewStatus: overviewRes.status,
          charactersStatus: charactersRes.status
        });

        // エラーチェック
        if (!overviewRes.ok) {
          const errorText = await overviewRes.text();
          console.error('❌ Overview API error:', {
            status: overviewRes.status,
            statusText: overviewRes.statusText,
            errorResponse: errorText
          });
          throw new Error(`統計データの取得に失敗しました (${overviewRes.status})`);
        }

        if (!charactersRes.ok) {
          const errorText = await charactersRes.text();
          console.error('❌ Characters API error:', {
            status: charactersRes.status,
            statusText: charactersRes.statusText,
            errorResponse: errorText
          });
          throw new Error(`キャラクターデータの取得に失敗しました (${charactersRes.status})`);
        }

        // レスポンスをパース
        const overviewData = await overviewRes.json();
        const charactersData = await charactersRes.json();

        console.log('📊 Admin Dashboard - Overview data:', overviewData);
        console.log('👥 Admin Dashboard - Characters data:', charactersData);

        // 🔍 デバッグ: APIレスポンス構造を詳細確認
        console.log('🔎 Overview API full response:', JSON.stringify(overviewData, null, 2));
        console.log('🔎 Characters API full response:', JSON.stringify(charactersData, null, 2));
        
        // 既存のトークン分析APIから統計データを抽出
        const dailyBreakdown = overviewData.breakdown?.daily || [];
        const uniqueUsersToday = dailyBreakdown.length > 0 ? dailyBreakdown[dailyBreakdown.length - 1]?.uniqueUsers || 0 : 0;
        const totalUniqueUsers = dailyBreakdown.reduce((acc: number, day: any) => {
          return Math.max(acc, day.uniqueUsers || 0);
        }, 0);
        
        setDashboardStats({
          totalUsers: totalUniqueUsers,
          activeUsers: uniqueUsersToday,
          totalTokensUsed: overviewData.overview?.totalTokensUsed || 0,
          totalCharacters: charactersData.characters?.length || 0,
          apiErrors: 0 // 現在利用可能なデータなし
        });
        
        console.log('📊 Calculated dashboard stats:', {
          totalUsers: totalUniqueUsers,
          activeUsers: uniqueUsersToday,
          totalTokensUsed: overviewData.overview?.totalTokensUsed || 0,
          totalCharacters: charactersData.characters?.length || 0
        });

        // キャラクターデータを設定
        setCharacters(charactersData.characters || []);

        // TODO: 以下のAPIが実装されたら有効化
        setUserStats([]);
        setTokenUsage([]);
        setNotifications([]);
        setSecurityEvents([]);
      } catch (err) {
        console.error('💥 Dashboard data fetch error:', err);
        const errorMessage = err instanceof Error ? err.message : 'ダッシュボードデータの読み込みに失敗しました';
        setError(errorMessage);
        console.log('🔍 Error details:', {
          errorType: typeof err,
          errorMessage: errorMessage,
          errorStack: err instanceof Error ? err.stack : 'No stack trace'
        });
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