'use client';

import { useState, useEffect } from 'react';
import { Clock, RefreshCw, Calendar, Activity, AlertCircle, CheckCircle } from 'lucide-react';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  description: string;
  frequency: string;
  nextRunJST: string;
  isActive: boolean;
  lastRunTime: string;
}

interface CronStatus {
  serverTime: string;
  serverTimeJST: string;
  jobs: CronJob[];
  monitoring: {
    note: string;
    logMessages: string[];
  };
}

export default function CronJobMonitor() {
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchCronStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setError('認証トークンが見つかりません');
        return;
      }

      const response = await fetch('/api/admin/cron-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setCronStatus(data.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('クーロンジョブ状態の取得に失敗しました');
      console.error('Cron status fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCronStatus();
    // 1分毎に自動更新
    const interval = setInterval(fetchCronStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tokyo'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getNextRunStatus = (nextRunJST: string) => {
    try {
      const nextRun = new Date(nextRunJST);
      const now = new Date();
      const diffMs = nextRun.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 0) {
        return { text: '実行中または次回計算中', color: 'text-yellow-600' };
      } else if (diffMinutes < 60) {
        return { text: `${diffMinutes}分後`, color: 'text-green-600' };
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        return { text: `${diffHours}時間後`, color: 'text-blue-600' };
      }
    } catch {
      return { text: '計算エラー', color: 'text-red-600' };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">クーロンジョブ状態を取得中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">クーロンジョブ監視</h3>
          <button
            onClick={fetchCronStatus}
            className="flex items-center space-x-2 px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>再取得</span>
          </button>
        </div>
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">クーロンジョブ監視</h3>
          <p className="text-sm text-gray-500">
            自動実行タスクの状態監視
            {lastUpdated && (
              <span className="ml-2">
                (最終更新: {formatDateTime(lastUpdated.toISOString())})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchCronStatus}
          className="flex items-center space-x-2 px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>更新</span>
        </button>
      </div>

      {cronStatus && (
        <>
          {/* サーバー時刻 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">サーバー時刻</span>
            </div>
            <div className="text-sm text-gray-600">
              JST: {formatDateTime(cronStatus.serverTimeJST)}
            </div>
          </div>

          {/* クーロンジョブ一覧 */}
          <div className="space-y-4">
            {cronStatus.jobs.map((job) => {
              const nextRunStatus = getNextRunStatus(job.nextRunJST);
              
              return (
                <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {job.isActive ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        <h4 className="font-medium text-gray-900">{job.name}</h4>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {job.frequency}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">次回実行</div>
                      <div className={`text-sm font-medium ${nextRunStatus.color}`}>
                        {nextRunStatus.text}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{job.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500">スケジュール:</span>
                      <code className="ml-1 px-1 py-0.5 bg-gray-100 rounded text-gray-700">
                        {job.schedule}
                      </code>
                    </div>
                    <div>
                      <span className="text-gray-500">次回実行時刻:</span>
                      <span className="ml-1 text-gray-700">
                        {formatDateTime(job.nextRunJST)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">最終実行:</span>
                      <span className="ml-1 text-gray-700">{job.lastRunTime}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 監視情報 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">監視情報</span>
            </div>
            <p className="text-sm text-blue-700 mb-3">{cronStatus.monitoring.note}</p>
            <div className="space-y-1">
              <p className="text-xs text-blue-600 font-medium">ログメッセージ例:</p>
              {cronStatus.monitoring.logMessages.map((message, index) => (
                <code key={index} className="block text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {message}
                </code>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}