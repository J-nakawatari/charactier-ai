'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import UserSidebar from '@/components/user/UserSidebar';

// 型定義
interface AffinityAnalyticsData {
  overallProgress: {
    totalLevel: number;
    unlockedImages: number;
    activeCharacters: number;
    averageLevel: number;
  };
  characterProgress: any[];
  intimacyTrends: any[];
  recentActivities: any[];
  insights: any[];
}

export default function AffinityAnalyticsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ja';
  const t = useTranslations('analytics');

  const [analyticsData, setAnalyticsData] = useState<AffinityAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedCharacter, setSelectedCharacter] = useState('all');

  useEffect(() => {
    const fetchAffinityAnalytics = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('accessToken');
        
        const response = await fetch(`/api/analytics/affinity?timeRange=${timeRange}&character=${selectedCharacter}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setAnalyticsData(data);
      } catch (error) {
        console.error('Affinity analytics fetch error:', error);
        // エラー時は空データを設定
        setAnalyticsData({
          overallProgress: {
            totalLevel: 0,
            unlockedImages: 0,
            activeCharacters: 0,
            averageLevel: 0
          },
          characterProgress: [],
          intimacyTrends: [],
          recentActivities: [],
          insights: []
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAffinityAnalytics();
  }, [timeRange, selectedCharacter]);

  const getRelationshipColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'stranger': '#94A3B8',
      'acquaintance': '#60A5FA',
      'friend': '#34D399',
      'close_friend': '#F59E0B',
      'best_friend': '#EF4444',
      'lover': '#EC4899',
      'soulmate': '#8B5CF6'
    };
    return colors[type] || '#94A3B8';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <UserSidebar locale={locale} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">親密度分析データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <UserSidebar locale={locale} />
      
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* ヘッダー */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">親密度分析</h1>
            <p className="text-gray-600">キャラクターとの関係性を詳細に分析します</p>
          </div>

          {/* フィルター */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">期間</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="7d">過去7日</option>
                  <option value="30d">過去30日</option>
                  <option value="90d">過去90日</option>
                  <option value="all">全期間</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">キャラクター</label>
                <select
                  value={selectedCharacter}
                  onChange={(e) => setSelectedCharacter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">全キャラクター</option>
                </select>
              </div>
            </div>
          </div>

          {/* データが無い場合の表示 */}
          {(!analyticsData || analyticsData.characterProgress.length === 0) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">分析データがありません</h3>
              <p className="text-gray-600 mb-6">
                キャラクターとの会話を開始すると、親密度の分析データが表示されます。
              </p>
              <button
                onClick={() => window.location.href = `/${locale}/characters`}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                キャラクターと話してみる
              </button>
            </div>
          )}

          {/* 実データがある場合の表示（将来実装） */}
          {analyticsData && analyticsData.characterProgress.length > 0 && (
            <div className="space-y-8">
              {/* 概要カード */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">総合レベル</h3>
                  <p className="text-3xl font-bold text-purple-600">
                    {analyticsData.overallProgress.totalLevel}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">解放済み画像</h3>
                  <p className="text-3xl font-bold text-pink-600">
                    {analyticsData.overallProgress.unlockedImages}枚
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">アクティブキャラ</h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {analyticsData.overallProgress.activeCharacters}体
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">平均レベル</h3>
                  <p className="text-3xl font-bold text-green-600">
                    {analyticsData.overallProgress.averageLevel.toFixed(1)}
                  </p>
                </div>
              </div>

              {/* 実装予定：チャートとグラフ */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">詳細分析</h3>
                <p className="text-gray-600">詳細な分析機能は実装中です。</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}