'use client';

import { useState, useEffect } from 'react';
import { Clock, RefreshCw, Calendar, Activity, AlertCircle, CheckCircle, FileText, Filter } from 'lucide-react';
import { adminFetch } from '@/utils/admin-fetch';

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

interface LogEntry {
  timestamp: string;
  type: 'info' | 'error' | 'success' | 'warning' | 'cron';
  message: string;
  isCronRelated: boolean;
}

interface LogData {
  logs: LogEntry[];
  totalLines: number;
  filter: string;
  cronJobLogs: LogEntry[];
  note?: string;
}

export default function CronJobMonitor() {
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logData, setLogData] = useState<LogData | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [logFilter, setLogFilter] = useState('cron');

  const fetchCronStatus = async () => {
    try {
      setLoading(true);
      
      const response = await adminFetch('/api/v1/admin/cron-status', {
        method: 'GET'
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

  const fetchLogs = async () => {
    try {
      setLogLoading(true);
      
      const response = await adminFetch(`/api/v1/admin/logs?lines=50&filter=${logFilter}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setLogData(data.data);
    } catch (err) {
      console.error('Logs fetch error:', err);
    } finally {
      setLogLoading(false);
    }
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'success': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'cron': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
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

          {/* 監視情報とログ表示 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">監視情報</span>
              </div>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="flex items-center space-x-2 px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText className="w-3 h-3" />
                <span>{showLogs ? 'ログを閉じる' : 'ログを表示'}</span>
              </button>
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

          {/* サーバーログ表示セクション */}
          {showLogs && (
            <div className="mt-6 border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">サーバーログ</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <select
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="cron">クーロン関連のみ</option>
                      <option value="all">全てのログ</option>
                      <option value="error">エラーのみ</option>
                    </select>
                    <button
                      onClick={fetchLogs}
                      disabled={logLoading}
                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${logLoading ? 'animate-spin' : ''}`} />
                      <span>更新</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                {logLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                    <span className="ml-2 text-sm text-gray-600">ログを取得中...</span>
                  </div>
                ) : logData ? (
                  <div className="space-y-2">
                    {logData.note && (
                      <p className="text-xs text-gray-500 mb-3">{logData.note}</p>
                    )}
                    
                    {logData.logs && logData.logs.length > 0 ? (
                      <div className="space-y-1 max-h-80 overflow-y-auto">
                        {logData.logs.map((log, index) => (
                          <div
                            key={index}
                            className={`text-xs p-2 rounded font-mono ${getLogTypeColor(log.type)} ${
                              log.isCronRelated ? 'border-l-2 border-purple-400' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-2">
                              <span className="text-gray-500 whitespace-nowrap">
                                {log.timestamp}
                              </span>
                              <span className={`px-1 rounded text-xs font-medium ${getLogTypeColor(log.type)}`}>
                                {log.type.toUpperCase()}
                              </span>
                              <span className="flex-1 break-all">
                                {log.message}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>該当するログが見つかりませんでした</p>
                      </div>
                    )}
                    
                    {logData.totalLines && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        総ログ行数: {logData.totalLines} | 表示中: {logData.logs?.length || 0}行
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    <button
                      onClick={fetchLogs}
                      className="flex items-center space-x-2 mx-auto px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>ログを取得</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}