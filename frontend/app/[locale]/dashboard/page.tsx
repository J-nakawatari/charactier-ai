'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import UserSidebar from '@/components/user/UserSidebar';
import NotificationSection from '@/components/user/NotificationSection';
import AffinitySection from '@/components/user/AffinitySection';
import TokenStatusCard from '@/components/user/TokenStatusCard';
import RecentChatHistory from '@/components/user/RecentChatHistory';
import PurchaseHistorySummary from '@/components/user/PurchaseHistorySummary';
import AnalyticsCharts from '@/components/user/AnalyticsCharts';
import { getAuthHeadersSync } from '@/utils/auth';
// 将来実装用コンポーネント（現在は非表示）
// import EnhancedAnalyticsSection from '@/components/future-features/EnhancedAnalyticsSection';
// import AchievementSystem from '@/components/future-features/AchievementSystem';

interface DashboardData {
  user: {
    _id: string;
    name: string;
    email: string;
    createdAt: Date;
    lastLoginAt: Date;
  };
  tokens: {
    balance: number;
    totalPurchased: number;
    totalUsed: number;
    recentUsage: Array<{ date: string; amount: number }>;
  };
  affinities: Array<any>;
  recentChats: Array<any>;
  purchaseHistory: Array<any>;
  loginHistory: Array<any>;
  notifications: Array<any>;
  analytics: any;
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ja';
  const t = useTranslations('dashboard');
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // API からダッシュボードデータを取得
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/v1/user/dashboard', {
          headers: getAuthHeadersSync()
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Dashboard API error:', response.status, errorData);
          throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        console.log('Dashboard data received:', data);
        console.log('Affinities data:', data.affinities);
        console.log('Affinities length:', data.affinities?.length || 0);
        console.log('Purchase history data:', data.purchaseHistory);
        console.log('Purchase history length:', data.purchaseHistory?.length || 0);
        
        // データ構造の検証
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid dashboard data format');
        }
        
        setDashboardData(data);
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
        
        // 401または404エラーの場合はログインページへリダイレクト
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('404'))) {
          console.error('Dashboard data fetch failed - authentication required');
          router.push(`/${locale}/login`);
        } else {
          // その他のエラーの場合はエラーメッセージを表示
          setDashboardData(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [locale, router]);


  // トークン残高更新ハンドラー
  const handleTokensUpdated = (newBalance: number) => {
    if (dashboardData) {
      setDashboardData({
        ...dashboardData,
        tokens: {
          ...dashboardData.tokens,
          balance: newBalance
        }
      });
    }
  };


  return (
    <div className="min-h-dvh bg-gray-50 flex">
      {/* サイドバー */}
      <UserSidebar locale={locale} />
      
      {/* メインコンテンツ */}
      <div className="flex-1 lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ローディング状態 */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          )}

          {/* データが読み込まれた場合のみ表示 */}
          {!isLoading && dashboardData && (
            <>
              {/* ヘッダー */}
              <div className="mb-6 md:mb-8">
                {/* SP: 縦並び、PC: 横並び */}
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div className="min-w-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2 leading-tight">
                      {t('title', { name: dashboardData.user.name || t('defaultUser') })}
                    </h1>
                    <p className="text-sm md:text-base text-gray-600">
                      {t('welcome')}
                    </p>
                  </div>
                </div>
              </div>

              {/* ダッシュボードグリッド */}
              <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* お知らせセクション - 全幅 */}
                <div className="md:col-span-2 lg:col-span-3">
                  <NotificationSection 
                    locale={locale}
                  />
                </div>

                {/* 親密度セクション */}
                <div className="md:col-span-2 lg:col-span-3">
                  <AffinitySection 
                    affinities={dashboardData.affinities}
                    locale={locale}
                  />
                </div>

                {/* トークンステータス */}
                <div className="md:col-span-1">
                  <TokenStatusCard 
                    balance={dashboardData.tokens.balance}
                    totalPurchased={dashboardData.tokens.totalPurchased}
                    recentUsage={dashboardData.tokens.recentUsage}
                    onTokensUpdated={handleTokensUpdated}
                  />
                </div>

                {/* 最近のチャット履歴 */}
                <div className="md:col-span-1">
                  <RecentChatHistory 
                    recentChats={dashboardData.recentChats}
                    locale={locale}
                  />
                </div>

                {/* 購入履歴サマリ */}
                <div className="md:col-span-1">
                  <PurchaseHistorySummary 
                    purchaseHistory={dashboardData.purchaseHistory}
                    locale={locale}
                  />
                </div>


                {/* 統計グラフ */}
                <div className="md:col-span-2 lg:col-span-3">
                  <AnalyticsCharts 
                    analytics={dashboardData.analytics}
                    locale={locale}
                  />
                </div>

                {/* 🎯 AI駆動インサイト - 将来実装用（現在は非表示）
                <div className="md:col-span-2 lg:col-span-3">
                  <EnhancedAnalyticsSection 
                    userId={dashboardData.user._id}
                  />
                </div>
                */}

                {/* 🏆 実績システム - 将来実装用（現在は非表示）
                <div className="md:col-span-2 lg:col-span-3">
                  <AchievementSystem 
                    userId={dashboardData.user._id}
                  />
                </div>
                */}
              </div>

              {/* 詳細統計リンクセクション - 将来実装用（現在は非表示）
              <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    詳細な統計を見る
                  </h3>
                  <p className="text-gray-600 mb-6">
                    より詳しい分析とインサイトをご覧いただけます
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => router.push(`/${locale}/analytics/tokens`)}
                      className="group flex flex-col items-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-transparent hover:border-blue-200 transition-all duration-200 hover:shadow-md"
                    >
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">トークン分析</h4>
                      <p className="text-xs text-gray-600 text-center">使用パターンと効率性</p>
                    </button>

                    <button
                      onClick={() => router.push(`/${locale}/analytics/chats`)}
                      className="group flex flex-col items-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-transparent hover:border-green-200 transition-all duration-200 hover:shadow-md"
                    >
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">チャット分析</h4>
                      <p className="text-xs text-gray-600 text-center">会話パターンと活動</p>
                    </button>

                    <button
                      onClick={() => router.push(`/${locale}/analytics/affinity`)}
                      className="group flex flex-col items-center p-6 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg border-2 border-transparent hover:border-pink-200 transition-all duration-200 hover:shadow-md"
                    >
                      <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-pink-200 transition-colors">
                        <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">親密度分析</h4>
                      <p className="text-xs text-gray-600 text-center">関係性と感情の深化</p>
                    </button>
                  </div>
                </div>
              </div>
              */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}