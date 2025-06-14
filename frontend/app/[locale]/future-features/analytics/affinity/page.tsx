'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
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
  const router = useRouter();
  const locale = (params?.locale as string) || 'ja';
  const t = useTranslations('analytics');

  const [analyticsData, setAnalyticsData] = useState<AffinityAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedCharacter, setSelectedCharacter] = useState('all');

  useEffect(() => {
    // 現在は未実装のため、空データを設定
    setIsLoading(true);
    setTimeout(() => {
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
      setIsLoading(false);
    }, 500);
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
      
      <div className="flex-1 lg:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* ヘッダー */}
          <div className="mb-8">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <Image
                    src="/icon/arrow.svg"
                    alt="戻る"
                    width={20}
                    height={20}
                    className="transform rotate-180"
                  />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    親密度分析
                  </h1>
                  <p className="text-gray-600">
                    キャラクターとの関係性を詳細に分析します
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* フィルター */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">期間</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                >
                  <option value="7d" className="text-gray-900">過去7日</option>
                  <option value="30d" className="text-gray-900">過去30日</option>
                  <option value="90d" className="text-gray-900">過去90日</option>
                  <option value="all" className="text-gray-900">全期間</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">キャラクター</label>
                <select
                  value={selectedCharacter}
                  onChange={(e) => setSelectedCharacter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                >
                  <option value="all" className="text-gray-900">全キャラクター</option>
                </select>
              </div>
            </div>
          </div>

          {/* 未実装機能の表示 */}
          {(!analyticsData || analyticsData.characterProgress.length === 0) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">🚧</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">親密度分析機能は準備中です</h3>
              <p className="text-gray-600 mb-6">
                詳細な親密度分析機能は現在開発中です。<br />
                基本的な親密度情報はダッシュボードでご確認いただけます。
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push(`/${locale}/dashboard`)}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  ダッシュボードに戻る
                </button>
                <button
                  onClick={() => router.push(`/${locale}/characters`)}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  キャラクターと話す
                </button>
              </div>
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