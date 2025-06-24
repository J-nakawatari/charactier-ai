'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  BarChart3,
  RefreshCw,
  Trash2,
  Database,
  Clock,
  TrendingUp,
  AlertTriangle,
  Server,
  Gauge,
  Eye,
  RotateCcw
} from 'lucide-react';
// import CacheAnalyticsDashboard from '../../../components/admin/CacheAnalyticsDashboard';

interface CachePerformanceMetrics {
  totalCaches: number;
  totalHits: number;
  hitRatio: number;
  averageGenerationTime: number;
  totalMemoryUsage: number;
  cachesByCharacter: CharacterCacheStats[];
  recentActivity: CacheActivity[];
  topPerformingCaches: CacheEntry[];
  invalidationEvents: number;
  cacheEfficiencyScore: number;
}

interface CharacterCacheStats {
  characterId: string;
  characterName: string;
  totalCaches: number;
  totalHits: number;
  hitRatio: number;
  averageGenerationTime: number;
  memoryUsage: number;
  lastUsed: Date;
  efficiency: number;
  affinityLevelDistribution: AffinityDistribution[];
}

interface AffinityDistribution {
  affinityRange: string;
  count: number;
  hitRatio: number;
}

interface CacheActivity {
  timestamp: Date;
  action: 'hit' | 'miss' | 'create' | 'invalidate';
  characterId: string;
  characterName: string;
  affinityLevel: number;
  generationTime?: number;
  userId: string;
}

interface CacheEntry {
  _id: string;
  characterId: string;
  characterName: string;
  affinityLevel: number;
  useCount: number;
  efficiency: number;
  lastUsed: Date;
  memorySize: number;
  hitRatio: number;
}

interface CacheInvalidationStats {
  totalInvalidations: number;
  byReason: {
    ttlExpired: number;
    characterUpdate: number;
    manual: number;
    lowUsage: number;
  };
  averageLifespan: number;
  lastCleanup: Date;
}

interface CacheCleanupResult {
  deletedCount: number;
  memoryFreed: number;
  cleanupTime: number;
}

export default function CacheManagementPage() {
  const [metrics, setMetrics] = useState<CachePerformanceMetrics | null>(null);
  const [invalidationStats, setInvalidationStats] = useState<CacheInvalidationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [timeframe, setTimeframe] = useState(30);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [cleanupResult, setCleanupResult] = useState<CacheCleanupResult | null>(null);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');

  const fetchCacheData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('adminAccessToken');
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const [metricsRes, invalidationRes] = await Promise.all([
        fetch(`/api/v1/admin/cache/performance?timeframe=${timeframe}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/v1/admin/cache/invalidation-stats?timeframe=${timeframe}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!metricsRes.ok || !invalidationRes.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const metricsData = await metricsRes.json();
      const invalidationData = await invalidationRes.json();

      setMetrics(metricsData.data);
      setInvalidationStats(invalidationData.data);
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Cache data fetch error:', err);
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchCacheData();
  }, [timeframe, fetchCacheData]);

  const handleCacheCleanup = async () => {
    setIsCleaningUp(true);
    setError('');
    
    try {
      const token = localStorage.getItem('adminAccessToken');
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch('/api/v1/admin/cache/cleanup', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('クリーンアップに失敗しました');
      }

      const result = await response.json();
      setCleanupResult(result.data);
      
      // データを再取得
      await fetchCacheData();

    } catch (err) {
      console.error('Cache cleanup error:', err);
      setError(err instanceof Error ? err.message : 'クリーンアップに失敗しました');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleCharacterCacheInvalidation = async (characterId: string) => {
    if (!confirm('このキャラクターのキャッシュを全て無効化しますか？')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminAccessToken');
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch(`/api/v1/admin/cache/character/${characterId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'manual_admin_invalidation' })
      });

      if (!response.ok) {
        throw new Error('キャッシュ無効化に失敗しました');
      }

      // データを再取得
      await fetchCacheData();

    } catch (err) {
      console.error('Character cache invalidation error:', err);
      setError(err instanceof Error ? err.message : 'キャッシュ無効化に失敗しました');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getEfficiencyColor = (efficiency: number): string => {
    if (efficiency >= 0.8) return 'text-green-600';
    if (efficiency >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Database className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">キャッシュ管理</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
          <span className="ml-2 text-gray-600">データを読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">キャッシュ管理</h1>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value={7}>過去7日</option>
            <option value={30}>過去30日</option>
            <option value={90}>過去90日</option>
          </select>
          <button
            onClick={fetchCacheData}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>更新</span>
          </button>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>概要</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>アナリティクス</span>
            </div>
          </button>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* クリーンアップ結果表示 */}
      {cleanupResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <RotateCcw className="w-5 h-5 text-green-500" />
            <span className="text-green-700">
              クリーンアップ完了: {cleanupResult.deletedCount}個のキャッシュを削除し、
              {formatBytes(cleanupResult.memoryFreed)}のメモリを解放しました
              (実行時間: {cleanupResult.cleanupTime}ms)
            </span>
          </div>
        </div>
      )}

      {/* タブコンテンツ */}
      {activeTab === 'overview' && metrics && (
        <>
          {/* メトリクス概要 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">総キャッシュ数</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalCaches.toLocaleString()}</p>
                </div>
                <Database className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">ヒット率</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPercentage(metrics.hitRatio)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">平均生成時間</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.averageGenerationTime.toFixed(0)}ms</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">総メモリ使用量</p>
                  <p className="text-2xl font-bold text-gray-900">{formatBytes(metrics.totalMemoryUsage)}</p>
                </div>
                <Server className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* キャッシュ管理アクション */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">キャッシュ管理</h3>
              <button
                onClick={handleCacheCleanup}
                disabled={isCleaningUp}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className={`w-4 h-4 ${isCleaningUp ? 'animate-spin' : ''}`} />
                <span>{isCleaningUp ? 'クリーンアップ中...' : 'キャッシュクリーンアップ'}</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <p className="font-medium">効率性スコア</p>
                <p className={`text-lg font-bold ${getEfficiencyColor(metrics.cacheEfficiencyScore)}`}>
                  {formatPercentage(metrics.cacheEfficiencyScore)}
                </p>
              </div>
              <div>
                <p className="font-medium">無効化イベント</p>
                <p className="text-lg font-bold text-gray-900">{metrics.invalidationEvents.toLocaleString()}</p>
              </div>
              <div>
                <p className="font-medium">最終更新</p>
                <p className="text-lg font-bold text-gray-900">
                  {lastUpdated.toLocaleTimeString('ja-JP')}
                </p>
              </div>
            </div>
          </div>

          {/* キャラクター別統計 */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">キャラクター別キャッシュ統計</h3>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm font-medium text-gray-500">
                      <th className="pb-3">キャラクター</th>
                      <th className="pb-3">キャッシュ数</th>
                      <th className="pb-3">ヒット数</th>
                      <th className="pb-3">ヒット率</th>
                      <th className="pb-3">平均生成時間</th>
                      <th className="pb-3">メモリ使用量</th>
                      <th className="pb-3">効率性</th>
                      <th className="pb-3">最終使用</th>
                      <th className="pb-3">アクション</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {metrics.cachesByCharacter.map((character) => (
                      <tr key={character.characterId} className="text-sm">
                        <td className="py-3 font-medium text-gray-900">{character.characterName}</td>
                        <td className="py-3 text-gray-700">{character.totalCaches.toLocaleString()}</td>
                        <td className="py-3 text-gray-700">{character.totalHits.toLocaleString()}</td>
                        <td className="py-3 text-gray-700">{formatPercentage(character.hitRatio)}</td>
                        <td className="py-3 text-gray-700">{character.averageGenerationTime.toFixed(0)}ms</td>
                        <td className="py-3 text-gray-700">{formatBytes(character.memoryUsage)}</td>
                        <td className={`py-3 font-medium ${getEfficiencyColor(character.efficiency)}`}>
                          {formatPercentage(character.efficiency)}
                        </td>
                        <td className="py-3 text-gray-700">
                          {new Date(character.lastUsed).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleCharacterCacheInvalidation(character.characterId)}
                            className="flex items-center space-x-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>無効化</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* トップパフォーマンスキャッシュ */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">トップパフォーマンスキャッシュ</h3>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm font-medium text-gray-500">
                      <th className="pb-3">キャラクター</th>
                      <th className="pb-3">親密度レベル</th>
                      <th className="pb-3">使用回数</th>
                      <th className="pb-3">効率性</th>
                      <th className="pb-3">メモリサイズ</th>
                      <th className="pb-3">最終使用</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {metrics.topPerformingCaches.slice(0, 10).map((cache) => (
                      <tr key={cache._id} className="text-sm">
                        <td className="py-3 font-medium text-gray-900">{cache.characterName}</td>
                        <td className="py-3 text-gray-700">{cache.affinityLevel}</td>
                        <td className="py-3 text-gray-700">{cache.useCount.toLocaleString()}</td>
                        <td className={`py-3 font-medium ${getEfficiencyColor(cache.efficiency)}`}>
                          {cache.efficiency.toFixed(3)}
                        </td>
                        <td className="py-3 text-gray-700">{formatBytes(cache.memorySize)}</td>
                        <td className="py-3 text-gray-700">
                          {new Date(cache.lastUsed).toLocaleDateString('ja-JP')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 無効化統計 */}
      {invalidationStats && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">キャッシュ無効化統計</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500">総無効化数</p>
                <p className="text-xl font-bold text-gray-900">{invalidationStats.totalInvalidations.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">TTL期限切れ</p>
                <p className="text-xl font-bold text-gray-900">{invalidationStats.byReason.ttlExpired.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">使用回数低下</p>
                <p className="text-xl font-bold text-gray-900">{invalidationStats.byReason.lowUsage.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">平均寿命</p>
                <p className="text-xl font-bold text-gray-900">{invalidationStats.averageLifespan.toFixed(1)}日</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* アナリティクスタブ */}
      {activeTab === 'analytics' && metrics && (
        <div>
          {/* <CacheAnalyticsDashboard
            characterStats={metrics.cachesByCharacter}
            topCaches={metrics.topPerformingCaches}
            recentActivity={metrics.recentActivity}
            hitRatio={metrics.hitRatio}
            efficiencyScore={metrics.cacheEfficiencyScore}
          /> */}
          <div className="text-center text-gray-500 py-8">Analytics Dashboard (準備中)</div>
        </div>
      )}
    </div>
  );
}