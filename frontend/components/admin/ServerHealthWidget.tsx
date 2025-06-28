'use client';

import React, { useState, useEffect } from 'react';
import { adminAuthenticatedFetch } from '@/utils/auth';
import { AlertCircle, Server, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  restartCount: number;
  memoryUsage: {
    percentage: number;
    used: number;
    total: number;
  };
  errorRate: number;
  alerts: Array<{
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: string;
  }>;
}

export default function ServerHealthWidget() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthStatus = async () => {
    try {
      const response = await adminAuthenticatedFetch('/api/v1/admin/system/health');
      if (!response.ok) {
        // APIが存在しない場合はダミーデータを設定
        if (response.status === 404) {
          setHealth({
            status: 'healthy',
            uptime: 0,
            restartCount: 0,
            memoryUsage: {
              percentage: 0,
              used: 0,
              total: 0
            },
            errorRate: 0,
            alerts: []
          });
          setError(null);
          return;
        }
        throw new Error('Failed to fetch health status');
      }
      const data = await response.json();
      // データの妥当性チェック
      const validatedData = {
        status: data.status || 'healthy',
        uptime: data.uptime || 0,
        restartCount: data.restartCount || 0,
        memoryUsage: data.memoryUsage || {
          percentage: 0,
          used: 0,
          total: 0
        },
        errorRate: typeof data.errorRate === 'number' ? data.errorRate : 0,
        alerts: Array.isArray(data.alerts) ? data.alerts : []
      };
      setHealth(validatedData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    const interval = setInterval(fetchHealthStatus, 300000); // 5分ごとに更新（レート制限対策）
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}時間${minutes}分`;
  };

  const getStatusIcon = () => {
    if (!health) return null;
    
    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    if (!health) return 'bg-gray-100';
    
    switch (health.status) {
      case 'healthy':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'bg-red-50 border-red-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-red-600">
          <AlertCircle className="w-6 h-6 mb-2" />
          <p>サーバー状態の取得に失敗しました</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow p-6 border ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Server className="w-5 h-5 text-gray-700" />
          サーバー状態
        </h3>
        {getStatusIcon()}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">稼働時間</span>
          <span className="text-sm font-medium text-gray-900">{health ? formatUptime(health.uptime) : '-'}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">再起動回数</span>
          <span className={`text-sm font-medium ${health && health.restartCount > 5 ? 'text-red-600' : 'text-gray-900'}`}>
            {health?.restartCount || 0}回
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">メモリ使用率</span>
          <span className={`text-sm font-medium ${health && health.memoryUsage && health.memoryUsage.percentage > 80 ? 'text-yellow-600' : 'text-gray-900'}`}>
            {health && health.memoryUsage ? `${health.memoryUsage.percentage.toFixed(1)}%` : '-'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">エラー率（過去1時間）</span>
          <span className={`text-sm font-medium ${health && typeof health.errorRate === 'number' && health.errorRate > 5 ? 'text-red-600' : 'text-gray-900'}`}>
            {health && typeof health.errorRate === 'number' ? `${health.errorRate.toFixed(1)}%` : '-'}
          </span>
        </div>
      </div>

      {health && health.alerts && health.alerts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-700" />
            アラート
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {health.alerts.map((alert, index) => (
              <div
                key={index}
                className={`text-xs p-2 rounded ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}
              >
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <a
          href="/admin/system/monitoring"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          詳細な監視データを見る
          <span>→</span>
        </a>
      </div>
    </div>
  );
}