'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminAuthenticatedFetch } from '@/utils/auth';
import { AlertTriangle, Clock, Filter, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';

interface ErrorStat {
  totalErrors: number;
  unresolvedErrors: number;
  avgResponseTime: number;
  errorsByType: Record<string, number>;
  errorsByStatus: Record<string, number>;
  topErrorEndpoints: Array<{ endpoint: string; count: number }>;
  totalRequests?: number;
}

interface APIError {
  _id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  errorType: string;
  errorMessage: string;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  responseTime: number;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  notes?: string;
}

export default function ErrorStatsPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [errorStats, setErrorStats] = useState<ErrorStat | null>(null);
  const [recentErrors, setRecentErrors] = useState<APIError[]>([]);
  const [selectedError, setSelectedError] = useState<APIError | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchErrorData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // エラー統計を取得
      const [statsRes, errorsRes] = await Promise.all([
        adminAuthenticatedFetch(`/api/v1/admin/error-stats?range=${timeRange}`),
        adminAuthenticatedFetch(`/api/v1/admin/errors?range=${timeRange}&limit=50`)
      ]);

      if (!statsRes.ok) throw new Error('エラー統計の取得に失敗しました');

      const statsData = await statsRes.json();
      console.log('📊 Error Stats Response:', statsData);
      setErrorStats(statsData.data.stats);

      // エラー一覧が実装されている場合
      if (errorsRes.ok) {
        const errorsData = await errorsRes.json();
        console.log('📋 Error List Response:', errorsData);
        setRecentErrors(errorsData.errors || []);
      } else {
        console.error('❌ Error List Failed:', errorsRes.status, errorsRes.statusText);
      }
    } catch (error) {
      console.error('Error fetching error data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchErrorData();
  }, [timeRange, fetchErrorData]);

  const getErrorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      validation: 'バリデーション',
      authentication: '認証',
      authorization: '認可',
      not_found: '未発見',
      rate_limit: 'レート制限',
      server_error: 'サーバー',
      database_error: 'データベース',
      external_api: '外部API',
      timeout: 'タイムアウト',
      unknown: 'その他'
    };
    return labels[type] || type;
  };

  const getStatusCodeColor = (code: number) => {
    if (code >= 500) return 'text-red-600';
    if (code >= 400) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">エラー統計を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              エラー統計
            </h1>
            <p className="text-sm text-gray-500 mt-1">APIエラーの詳細分析</p>
          </div>
          
          <div className="flex gap-3">
            {/* 時間範囲選択 */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white"
            >
              <option value="1h">過去1時間</option>
              <option value="24h">過去24時間</option>
              <option value="7d">過去7日間</option>
              <option value="30d">過去30日間</option>
            </select>
            
            {/* 更新ボタン */}
            <button
              onClick={fetchErrorData}
              disabled={refreshing}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''} text-gray-600`} />
              <span className="text-gray-700">更新</span>
            </button>
            
            {/* 統計リセットボタン（デバッグ用） */}
            {/* デバッグ用ボタン */}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (confirm('テスト用のエラーデータを生成しますか？')) {
                    try {
                      const response = await adminAuthenticatedFetch('/api/v1/admin/errors/test', {
                        method: 'POST'
                      });
                      if (response.ok) {
                        const data = await response.json();
                        alert(`${data.message}`);
                        fetchErrorData(); // データを再取得
                      } else {
                        const error = await response.text();
                        alert(`エラー生成失敗: ${error}`);
                      }
                    } catch (error) {
                      console.error('Failed to create test errors:', error);
                      alert('テストエラーの生成に失敗しました');
                    }
                  }
                }}
                className="px-4 py-2 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 text-blue-700"
              >
                テストエラー生成
              </button>
              
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={async () => {
                    if (confirm('監視統計をリセットしますか？この操作は取り消せません。')) {
                      try {
                        console.log('統計リセット機能は開発中です');
                        alert('統計は1時間ごとに自動的にリセットされます');
                      } catch (error) {
                        console.error('Failed to reset stats:', error);
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 text-red-700"
                >
                  統計リセット（デバッグ）
                </button>
              )}
            </div>
          </div>
        </div>

        {errorStats && (
          <>
            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">総エラー数</p>
                    <p className="text-2xl font-bold text-gray-900">{errorStats.totalErrors}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">未解決</p>
                    <p className="text-2xl font-bold text-red-600">{errorStats.unresolvedErrors}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">平均応答時間</p>
                    <p className="text-2xl font-bold text-gray-900">{errorStats.avgResponseTime}ms</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">エラー率</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {errorStats.totalRequests && errorStats.totalRequests > 0 
                        ? ((errorStats.totalErrors / errorStats.totalRequests) * 100).toFixed(1) 
                        : '0.0'}%
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {errorStats.totalErrors} / {errorStats.totalRequests || 0} リクエスト
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>

            {/* エラータイプ別統計 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* エラータイプ別 */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">エラータイプ別</h3>
                <div className="space-y-3">
                  {Object.entries(errorStats.errorsByType)
                    .sort(([,a], [,b]) => b - a)
                    .map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">{getErrorTypeLabel(type)}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${(count / errorStats.totalErrors) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* ステータスコード別 */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">ステータスコード別</h3>
                <div className="space-y-3">
                  {Object.entries(errorStats.errorsByStatus)
                    .sort(([,a], [,b]) => b - a)
                    .map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center">
                        <span className={`text-sm font-mono ${getStatusCodeColor(parseInt(status))}`}>
                          {status}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full"
                              style={{ width: `${(count / errorStats.totalErrors) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* エラー多発エンドポイント */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">エラー多発エンドポイント</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">エンドポイント</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">エラー数</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">割合</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorStats.topErrorEndpoints.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm text-gray-900 font-mono">{item.endpoint}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right">{item.count}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right">
                          {((item.count / errorStats.totalErrors) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 最近のエラー一覧 */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">最近のエラー</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">時刻</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">エンドポイント</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">メソッド</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">ステータス</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">タイプ</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">メッセージ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentErrors.length > 0 ? (
                      recentErrors.map((error) => (
                        <tr 
                          key={error._id} 
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedError(error)}
                        >
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {new Date(error.timestamp).toLocaleString('ja-JP')}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 font-mono max-w-xs truncate">
                            {error.endpoint}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 rounded">
                              {error.method}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`font-medium ${getStatusCodeColor(error.statusCode)}`}>
                              {error.statusCode}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {getErrorTypeLabel(error.errorType)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                            {error.errorMessage}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          エラーデータがありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* エラー詳細モーダル */}
        {selectedError && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">エラー詳細</h3>
                  <button
                    onClick={() => setSelectedError(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">エラーID</p>
                      <p className="font-mono text-sm">{selectedError._id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">発生時刻</p>
                      <p className="text-sm">{new Date(selectedError.timestamp).toLocaleString('ja-JP')}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">エンドポイント</p>
                    <p className="font-mono text-sm">{selectedError.method} {selectedError.endpoint}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">ステータスコード</p>
                      <p className={`font-medium ${getStatusCodeColor(selectedError.statusCode)}`}>
                        {selectedError.statusCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">エラータイプ</p>
                      <p className="text-sm">{getErrorTypeLabel(selectedError.errorType)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">エラーメッセージ</p>
                    <p className="text-sm bg-gray-50 p-3 rounded">{selectedError.errorMessage}</p>
                  </div>
                  
                  {selectedError.userAgent && (
                    <div>
                      <p className="text-sm text-gray-500">ユーザーエージェント</p>
                      <p className="text-sm font-mono bg-gray-50 p-3 rounded break-all">
                        {selectedError.userAgent}
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">IPアドレス</p>
                      <p className="text-sm">{selectedError.ipAddress || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">応答時間</p>
                      <p className="text-sm">{selectedError.responseTime}ms</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}