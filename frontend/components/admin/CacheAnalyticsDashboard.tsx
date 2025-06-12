'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Database,
  Gauge
} from 'lucide-react';

interface CacheAnalyticsProps {
  characterStats: CharacterCacheStats[];
  topCaches: CacheEntry[];
  recentActivity: CacheActivity[];
  hitRatio: number;
  efficiencyScore: number;
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

interface CacheActivity {
  timestamp: Date;
  action: 'hit' | 'miss' | 'create' | 'invalidate';
  characterId: string;
  characterName: string;
  affinityLevel: number;
  generationTime?: number;
  userId: string;
}

const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];

export default function CacheAnalyticsDashboard({
  characterStats,
  topCaches,
  recentActivity,
  hitRatio,
  efficiencyScore
}: CacheAnalyticsProps) {
  const [selectedMetric, setSelectedMetric] = useState<'hits' | 'efficiency' | 'memory'>('hits');

  // キャラクター別データの準備
  const characterChartData = characterStats.slice(0, 10).map(stat => ({
    name: stat.characterName.length > 8 ? stat.characterName.slice(0, 8) + '...' : stat.characterName,
    fullName: stat.characterName,
    hits: stat.totalHits,
    caches: stat.totalCaches,
    hitRatio: stat.hitRatio * 100,
    efficiency: stat.efficiency * 100,
    memory: Math.round(stat.memoryUsage / 1024), // KB
    generationTime: stat.averageGenerationTime
  }));

  // 親密度レベル分布データの準備
  const affinityDistributionData = characterStats.reduce((acc, stat) => {
    stat.affinityLevelDistribution.forEach(dist => {
      const existing = acc.find(item => item.range === dist.affinityRange);
      if (existing) {
        existing.count += dist.count;
        existing.hitRatio = (existing.hitRatio + dist.hitRatio) / 2;
      } else {
        acc.push({
          range: dist.affinityRange,
          count: dist.count,
          hitRatio: dist.hitRatio * 100
        });
      }
    });
    return acc;
  }, [] as Array<{ range: string; count: number; hitRatio: number }>);

  // 時間別アクティビティデータの準備
  const hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
    const hourStr = hour.toString().padStart(2, '0');
    const activities = recentActivity.filter(activity => {
      const activityHour = new Date(activity.timestamp).getHours();
      return activityHour === hour;
    });
    
    return {
      hour: `${hourStr}:00`,
      hits: activities.filter(a => a.action === 'hit').length,
      misses: activities.filter(a => a.action === 'miss').length,
      creates: activities.filter(a => a.action === 'create').length,
      invalidates: activities.filter(a => a.action === 'invalidate').length,
      total: activities.length
    };
  });

  // メモリ使用量分布データ
  const memoryDistributionData = characterStats.map(stat => ({
    name: stat.characterName.length > 10 ? stat.characterName.slice(0, 10) + '...' : stat.characterName,
    value: Math.round(stat.memoryUsage / 1024) // KB
  })).sort((a, b) => b.value - a.value).slice(0, 8);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getMetricColor = (value: number, type: 'hitRatio' | 'efficiency'): string => {
    if (type === 'hitRatio') {
      if (value >= 80) return 'text-green-600';
      if (value >= 60) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (value >= 80) return 'text-green-600';
      if (value >= 60) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* 総合パフォーマンス指標 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">総合ヒット率</p>
              <p className={`text-xl font-bold ${getMetricColor(hitRatio * 100, 'hitRatio')}`}>
                {(hitRatio * 100).toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">効率性スコア</p>
              <p className={`text-xl font-bold ${getMetricColor(efficiencyScore * 100, 'efficiency')}`}>
                {(efficiencyScore * 100).toFixed(1)}%
              </p>
            </div>
            <Gauge className="w-6 h-6 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">アクティブキャラ</p>
              <p className="text-xl font-bold text-gray-900">{characterStats.length}</p>
            </div>
            <Database className="w-6 h-6 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">今日のアクティビティ</p>
              <p className="text-xl font-bold text-gray-900">{recentActivity.length}</p>
            </div>
            <Activity className="w-6 h-6 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* キャラクター別パフォーマンス */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">キャラクター別パフォーマンス</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedMetric('hits')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedMetric === 'hits'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ヒット数
            </button>
            <button
              onClick={() => setSelectedMetric('efficiency')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedMetric === 'efficiency'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              効率性
            </button>
            <button
              onClick={() => setSelectedMetric('memory')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedMetric === 'memory'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              メモリ使用量
            </button>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={characterChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'hits') return [value, 'ヒット数'];
                  if (name === 'efficiency') return [`${value}%`, '効率性'];
                  if (name === 'memory') return [`${value}KB`, 'メモリ使用量'];
                  return [value, name];
                }}
                labelFormatter={(label) => {
                  const item = characterChartData.find(d => d.name === label);
                  return item ? item.fullName : label;
                }}
              />
              <Bar
                dataKey={selectedMetric}
                fill="#8B5CF6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 親密度レベル分布 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">親密度レベル別分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={affinityDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, count }) => `${range}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {affinityDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [value, 'キャッシュ数']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 時間別アクティビティ */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">時間別キャッシュアクティビティ</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 10 }}
                  interval={2}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="hits"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.6}
                  name="ヒット"
                />
                <Area
                  type="monotone"
                  dataKey="creates"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                  name="作成"
                />
                <Area
                  type="monotone"
                  dataKey="invalidates"
                  stackId="1"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.6}
                  name="無効化"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* メモリ使用量分布 */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">キャラクター別メモリ使用量</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={memoryDistributionData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip 
                formatter={(value) => [`${value}KB`, 'メモリ使用量']}
              />
              <Bar
                dataKey="value"
                fill="#F59E0B"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 最近のアクティビティ */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">最近のキャッシュアクティビティ</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm font-medium text-gray-500">
                <th className="pb-3">時刻</th>
                <th className="pb-3">アクション</th>
                <th className="pb-3">キャラクター</th>
                <th className="pb-3">親密度レベル</th>
                <th className="pb-3">生成時間</th>
                <th className="pb-3">ユーザーID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentActivity.slice(0, 10).map((activity, index) => (
                <tr key={index} className="text-sm">
                  <td className="py-3 text-gray-700">
                    {new Date(activity.timestamp).toLocaleTimeString('ja-JP')}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      activity.action === 'hit' ? 'bg-green-100 text-green-700' :
                      activity.action === 'miss' ? 'bg-red-100 text-red-700' :
                      activity.action === 'create' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {activity.action === 'hit' ? 'ヒット' :
                       activity.action === 'miss' ? 'ミス' :
                       activity.action === 'create' ? '作成' : '無効化'}
                    </span>
                  </td>
                  <td className="py-3 font-medium text-gray-900">{activity.characterName}</td>
                  <td className="py-3 text-gray-700">{activity.affinityLevel}</td>
                  <td className="py-3 text-gray-700">
                    {activity.generationTime ? `${activity.generationTime}ms` : '-'}
                  </td>
                  <td className="py-3 text-gray-700 font-mono text-xs">
                    {activity.userId.slice(-8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}