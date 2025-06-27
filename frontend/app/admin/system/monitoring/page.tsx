'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/utils/admin-api';
import { AlertCircle, Server, Activity, Users, Clock, Zap, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface MonitoringData {
  timeRange: {
    start: string;
    end: string;
  };
  requestStats: {
    total: number;
    byIp: Array<{
      ip: string;
      count: number;
      suspicious: boolean;
      userAgent: string;
      isBot: boolean;
      topPaths: Array<{ path: string; count: number }>;
      referer: string;
      firstSeen: string;
      lastSeen: string;
    }>;
  };
  errorStats: {
    total: number;
    by5xx: number;
    by4xx: number;
    errorRate: number;
  };
  performanceStats: {
    avgResponseTime: number;
    slowRequests: number;
  };
  restartHistory: Array<{
    timestamp: string;
    reason: string;
  }>;
}

export default function SystemMonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [period, setPeriod] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonitoringData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminFetch(`/api/v1/admin/system/monitoring?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchMonitoringData();
  }, [period, fetchMonitoringData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700">監視データの取得に失敗しました</p>
            <button 
              onClick={fetchMonitoringData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                ダッシュボードに戻る
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">サーバー監視</h1>
            <p className="text-sm text-gray-500 mt-1">
              リアルタイムのシステムパフォーマンスと異常検知
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="1h">過去1時間</option>
              <option value="6h">過去6時間</option>
              <option value="24h">過去24時間</option>
              <option value="7d">過去7日間</option>
            </select>
            <button
              onClick={fetchMonitoringData}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {data && (
          <>
            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm">総リクエスト数</span>
                  <Activity className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{data.requestStats.total.toLocaleString()}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm">エラー率</span>
                  <AlertCircle className="w-5 h-5 text-gray-400" />
                </div>
                <p className={`text-3xl font-bold ${data.errorStats.errorRate > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                  {data.errorStats.errorRate.toFixed(1)}%
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm">平均応答時間</span>
                  <Zap className="w-5 h-5 text-gray-400" />
                </div>
                <p className={`text-3xl font-bold ${data.performanceStats.avgResponseTime > 1000 ? 'text-yellow-600' : 'text-gray-900'}`}>
                  {data.performanceStats.avgResponseTime.toFixed(0)}ms
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm">再起動回数</span>
                  <Server className="w-5 h-5 text-gray-400" />
                </div>
                <p className={`text-3xl font-bold ${data.restartHistory.length > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                  {data.restartHistory.length}
                </p>
              </div>
            </div>

            {/* リクエスト統計 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-700" />
                    IPアドレス別アクセス詳細
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {data.requestStats.byIp.map((item, index) => (
                      <div key={index} className="border-b border-gray-100 pb-4 last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className={`font-medium ${item.suspicious ? 'text-red-600' : 'text-gray-900'}`}>
                              {item.ip}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">
                              ({item.count}回)
                            </span>
                            {item.isBot && (
                              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded ml-2">
                                BOT
                              </span>
                            )}
                            {item.suspicious && (
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded ml-2">
                                異常
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-600 space-y-1 ml-4">
                          <div className="truncate">
                            <span className="font-medium">UA:</span> {item.userAgent}
                          </div>
                          <div>
                            <span className="font-medium">参照元:</span> {item.referer}
                          </div>
                          <div>
                            <span className="font-medium">アクセスパス:</span>
                            {item.topPaths.map((path, i) => (
                              <span key={i} className="ml-2">
                                {path.path} ({path.count}回)
                                {i < item.topPaths.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                          <div>
                            <span className="font-medium">初回:</span> {formatDate(item.firstSeen)} / 
                            <span className="font-medium ml-2">最終:</span> {formatDate(item.lastSeen)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-700" />
                    再起動履歴
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {data.restartHistory.length === 0 ? (
                      <p className="text-gray-500 text-sm">再起動履歴はありません</p>
                    ) : (
                      data.restartHistory.map((restart, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-gray-900">{formatDate(restart.timestamp)}</span>
                          <span className="text-xs text-gray-500">{restart.reason}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* エラー詳細 */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">エラー統計</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">5xxエラー</p>
                    <p className="text-2xl font-bold text-red-600">{data.errorStats.by5xx}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">4xxエラー</p>
                    <p className="text-2xl font-bold text-yellow-600">{data.errorStats.by4xx}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">遅いリクエスト（1秒以上）</p>
                    <p className="text-2xl font-bold text-orange-600">{data.performanceStats.slowRequests}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}