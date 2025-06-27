'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminFetch } from '@/utils/admin-api';
import { 
  ArrowLeft, 
  Eye,
  Users,
  UserCheck,
  Calendar,
  BarChart3,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

// 型定義
interface NotificationStats {
  notificationId: string;
  totalRecipients: number;
  totalViews: number;
  uniqueViews: number;
  viewRate: number;
  dismissRate: number;
  clickedActions: number;
  viewsByDate: Array<{
    date: string;
    views: number;
  }>;
  viewsByHour: Array<{
    hour: number;
    views: number;
  }>;
  topViewers: Array<{
    userId: string;
    userName: string;
    viewCount: number;
    lastViewedAt: string;
  }>;
}

export default function NotificationStatsPage() {
  const router = useRouter();
  const params = useParams();
  const notificationId = params?.id as string;

  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 統計データを取得
  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response = await adminFetch(`/api/v1/admin/notifications/${notificationId}/stats`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (error) {
      console.error('統計取得エラー:', error);
      setError('統計データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [notificationId]);

  useEffect(() => {
    if (notificationId) {
      fetchStats();
    }
  }, [notificationId, fetchStats]);

  // バーチャート描画
  const renderBarChart = (data: { value: number; label: string }[], maxValue: number) => {
    return (
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-16 text-sm text-gray-600 text-right">{item.label}</div>
            <div className="flex-1">
              <div className="relative h-6 bg-gray-200 rounded">
                <div
                  className="absolute top-0 left-0 h-full bg-purple-600 rounded"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  {item.value}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-dvh bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-red-600 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <p>{error || '統計データが見つかりません'}</p>
              <button
                onClick={() => router.push(`/admin/notifications/${notificationId}`)}
                className="mt-4 text-purple-600 hover:text-purple-700"
              >
                詳細に戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 日付別データを準備
  const viewsByDateData = stats.viewsByDate.map(item => ({
    value: item.views,
    label: new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  }));
  const maxDailyViews = Math.max(...stats.viewsByDate.map(item => item.views), 1);

  // 時間別データを準備
  const viewsByHourData = stats.viewsByHour.map(item => ({
    value: item.views,
    label: `${item.hour}時`
  }));
  const maxHourlyViews = Math.max(...stats.viewsByHour.map(item => item.views), 1);

  return (
    <div className="min-h-dvh bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/admin/notifications/${notificationId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            詳細に戻る
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900">お知らせ統計</h1>
        </div>

        {/* 概要カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">対象ユーザー</p>
                <p className="text-2xl font-bold mt-1">{stats.totalRecipients.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">総表示回数</p>
                <p className="text-2xl font-bold mt-1">{stats.totalViews.toLocaleString()}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ユニーク表示</p>
                <p className="text-2xl font-bold mt-1">{stats.uniqueViews.toLocaleString()}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">表示率</p>
                <p className="text-2xl font-bold mt-1">{stats.viewRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* グラフセクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 日別表示推移 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-purple-600" />
              日別表示推移
            </h2>
            {viewsByDateData.length > 0 ? (
              renderBarChart(viewsByDateData.slice(-7), maxDailyViews)
            ) : (
              <p className="text-gray-500 text-center py-8">データがありません</p>
            )}
          </div>

          {/* 時間別表示分布 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
              時間別表示分布
            </h2>
            {viewsByHourData.length > 0 ? (
              <div className="h-64 overflow-y-auto">
                {renderBarChart(viewsByHourData, maxHourlyViews)}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">データがありません</p>
            )}
          </div>
        </div>

        {/* 詳細データ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* エンゲージメント */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">エンゲージメント</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">アクションクリック数</span>
                <span className="font-medium">{stats.clickedActions.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">閉じる率</span>
                <span className="font-medium">{stats.dismissRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">平均表示回数/ユーザー</span>
                <span className="font-medium">
                  {stats.uniqueViews > 0 ? (stats.totalViews / stats.uniqueViews).toFixed(1) : 0}
                </span>
              </div>
            </div>
          </div>

          {/* トップビューワー */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">アクティブユーザー（表示回数順）</h2>
            <div className="space-y-3">
              {stats.topViewers.slice(0, 5).map((viewer, index) => (
                <div key={viewer.userId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{viewer.userName}</p>
                      <p className="text-xs text-gray-500">
                        最終表示: {new Date(viewer.lastViewedAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{viewer.viewCount}回</span>
                </div>
              ))}
              {stats.topViewers.length === 0 && (
                <p className="text-gray-500 text-center py-4">データがありません</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}