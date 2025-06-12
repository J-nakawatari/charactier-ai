'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  Users, 
  Activity,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

// 🔄 分析データ型定義
interface AnalyticsOverview {
  period: string;
  overview: {
    totalTokensUsed: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalMessages: number;
    avgTokensPerMessage: number;
    maxTokensInMessage: number;
    minTokensInMessage: number;
  };
  financial: {
    totalApiCostUsd: number;
    totalApiCostYen: number;
    totalGrossProfit: number;
    netProfit: number;
    netProfitMargin: number;
    avgProfitMargin: number;
    profitableMessageRate: number;
    highCostMessageCount: number;
  };
  breakdown: {
    daily: Array<{
      date: string;
      tokens: number;
      cost: number;
      profit: number;
      messages: number;
    }>;
    byModel: Array<{
      model: string;
      tokens: number;
      cost: number;
      avgCostPerToken: number;
      messageCount: number;
    }>;
  };
  topUsers: Array<{
    userId: string;
    email: string;
    totalTokens: number;
    totalCost: number;
    messageCount: number;
  }>;
  topCharacters: Array<{
    characterId: string;
    name: string;
    totalTokens: number;
    totalCost: number;
    messageCount: number;
  }>;
}

interface ProfitAnalysis {
  profitDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  modelProfitability: Array<{
    model: string;
    avgProfit: number;
    profitMargin: number;
    totalMessages: number;
  }>;
  lowProfitMessages: Array<{
    characterId: string;
    characterName: string;
    avgProfit: number;
    messageCount: number;
    totalCost: number;
  }>;
}

interface AnomalyData {
  suspiciousUsers: Array<{
    userId: string;
    email: string;
    riskScore: number;
    riskLevel: 'high' | 'medium' | 'low';
    anomalies: string[];
    stats: {
      totalTokens: number;
      messageCount: number;
      totalCost: number;
      avgTokensPerMessage: number;
    };
  }>;
  anomalyStats: {
    totalSuspiciousUsers: number;
    highRiskUsers: number;
    abnormalMessages: number;
    costAnomalies: number;
  };
}

interface TokenAnalyticsDashboardProps {
  // オプショナルなプロパティで外部から期間を制御可能
  defaultDays?: number;
}

export default function TokenAnalyticsDashboard({ defaultDays = 30 }: TokenAnalyticsDashboardProps) {
  const { success, error: showError, warning } = useToast();
  
  // 📊 状態管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(defaultDays);
  const [activeSection, setActiveSection] = useState<'overview' | 'profit' | 'trends' | 'anomalies'>('overview');
  
  // 📈 データ状態
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [profitAnalysis, setProfitAnalysis] = useState<ProfitAnalysis | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyData | null>(null);

  // 🔄 データ取得
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [overviewRes, profitRes, anomalyRes] = await Promise.all([
        fetch(`/api/admin/token-analytics/overview?days=${selectedDays}`, { headers }),
        fetch(`/api/admin/token-analytics/profit-analysis?days=${selectedDays}`, { headers }),
        fetch(`/api/admin/token-analytics/anomaly-detection?hours=24`, { headers })
      ]);

      if (!overviewRes.ok || !profitRes.ok || !anomalyRes.ok) {
        throw new Error('分析データの取得に失敗しました');
      }

      const [overviewData, profitData, anomalyData] = await Promise.all([
        overviewRes.json(),
        profitRes.json(),
        anomalyRes.json()
      ]);

      setOverview(overviewData);
      setProfitAnalysis(profitData);
      setAnomalies(anomalyData);

      console.log('📊 Analytics data loaded:', {
        overview: overviewData.overview,
        profit: profitData.profitDistribution?.length || 0,
        anomalies: anomalyData.anomalyStats
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '分析データの読み込みに失敗しました';
      setError(errorMessage);
      showError(errorMessage);
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedDays]);

  // 🎨 ユーティリティ関数
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ja-JP').format(num);
  };

  const formatCurrency = (amount: number, currency: 'USD' | 'JPY' = 'JPY') => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatPercentage = (ratio: number) => {
    return `${(ratio * 100).toFixed(1)}%`;
  };

  // 📅 期間選択ハンドラー
  const handleDaysChange = (days: number) => {
    setSelectedDays(days);
  };

  // 📊 概要セクションレンダー
  const renderOverviewSection = () => {
    if (!overview) return null;

    return (
      <div className="space-y-6">
        {/* サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総トークン使用量</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(overview.overview.totalTokensUsed)}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              入力: {formatNumber(overview.overview.totalInputTokens)} | 
              出力: {formatNumber(overview.overview.totalOutputTokens)}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総メッセージ数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(overview.overview.totalMessages)}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              平均 {formatNumber(overview.overview.avgTokensPerMessage)} トークン/メッセージ
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API費用 (JPY)</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(overview.financial.totalApiCostYen)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              USD: {formatCurrency(overview.financial.totalApiCostUsd, 'USD')}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">純利益</p>
                <p className={`text-2xl font-bold ${overview.financial.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(overview.financial.netProfit)}
                </p>
              </div>
              {overview.financial.netProfit >= 0 ? 
                <TrendingUp className="h-8 w-8 text-green-600" /> : 
                <TrendingDown className="h-8 w-8 text-red-600" />
              }
            </div>
            <p className="text-xs text-gray-500 mt-2">
              利益率: {formatPercentage(overview.financial.netProfitMargin)}
            </p>
          </div>
        </div>

        {/* トップユーザー・キャラクター */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">トップユーザー（トークン使用量）</h3>
            <div className="space-y-3">
              {overview.topUsers.slice(0, 5).map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.email}</p>
                      <p className="text-xs text-gray-500">{user.messageCount} メッセージ</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatNumber(user.totalTokens)}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(user.totalCost)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">トップキャラクター（トークン使用量）</h3>
            <div className="space-y-3">
              {overview.topCharacters.slice(0, 5).map((character, index) => (
                <div key={character.characterId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{character.name}</p>
                      <p className="text-xs text-gray-500">{character.messageCount} メッセージ</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatNumber(character.totalTokens)}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(character.totalCost)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 💰 利益分析セクションレンダー
  const renderProfitSection = () => {
    if (!profitAnalysis) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 利益分布 */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">利益分布</h3>
            <div className="space-y-3">
              {profitAnalysis.profitDistribution.map((range, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{range.range}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${range.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {range.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* モデル別収益性 */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">モデル別収益性</h3>
            <div className="space-y-3">
              {profitAnalysis.modelProfitability.map((model, index) => (
                <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{model.model}</span>
                    <span className={`text-sm font-bold ${model.profitMargin >= 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(model.profitMargin)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>平均利益: {formatCurrency(model.avgProfit)}</span>
                    <span>{formatNumber(model.totalMessages)} メッセージ</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 低利益キャラクター */}
        {profitAnalysis.lowProfitMessages.length > 0 && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
              低利益キャラクター（要注意）
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">キャラクター名</th>
                    <th className="text-left py-2">平均利益</th>
                    <th className="text-left py-2">メッセージ数</th>
                    <th className="text-left py-2">総費用</th>
                  </tr>
                </thead>
                <tbody>
                  {profitAnalysis.lowProfitMessages.map((character, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2">{character.characterName}</td>
                      <td className="py-2 text-red-600 font-medium">
                        {formatCurrency(character.avgProfit)}
                      </td>
                      <td className="py-2">{formatNumber(character.messageCount)}</td>
                      <td className="py-2">{formatCurrency(character.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 🚨 異常検知セクションレンダー
  const renderAnomaliesSection = () => {
    if (!anomalies) return null;

    return (
      <div className="space-y-6">
        {/* 異常統計 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">不審ユーザー</p>
                <p className="text-xl font-bold text-red-600">
                  {anomalies.anomalyStats.totalSuspiciousUsers}
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">高リスク</p>
                <p className="text-xl font-bold text-red-700">
                  {anomalies.anomalyStats.highRiskUsers}
                </p>
              </div>
              <Users className="h-6 w-6 text-red-700" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">異常メッセージ</p>
                <p className="text-xl font-bold text-yellow-600">
                  {anomalies.anomalyStats.abnormalMessages}
                </p>
              </div>
              <Activity className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">費用異常</p>
                <p className="text-xl font-bold text-orange-600">
                  {anomalies.anomalyStats.costAnomalies}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* 不審ユーザーリスト */}
        {anomalies.suspiciousUsers.length > 0 && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">不審ユーザー詳細</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">ユーザー</th>
                    <th className="text-left py-2">リスクレベル</th>
                    <th className="text-left py-2">リスクスコア</th>
                    <th className="text-left py-2">異常項目</th>
                    <th className="text-left py-2">統計</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.suspiciousUsers.map((user, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2">{user.email}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                          user.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.riskLevel === 'high' ? '高' : user.riskLevel === 'medium' ? '中' : '低'}
                        </span>
                      </td>
                      <td className="py-2 font-medium">{user.riskScore.toFixed(1)}</td>
                      <td className="py-2">
                        <div className="text-xs">
                          {user.anomalies.map((anomaly, i) => (
                            <div key={i} className="text-gray-600">{anomaly}</div>
                          ))}
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="text-xs text-gray-600">
                          <div>{formatNumber(user.stats.totalTokens)} トークン</div>
                          <div>{user.stats.messageCount} メッセージ</div>
                          <div>{formatCurrency(user.stats.totalCost)}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">詳細分析データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* コントロールパネル */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">期間:</span>
              <select 
                value={selectedDays} 
                onChange={(e) => handleDaysChange(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value={7}>過去7日間</option>
                <option value={14}>過去14日間</option>
                <option value={30}>過去30日間</option>
                <option value={90}>過去90日間</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={fetchAnalyticsData}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">更新</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm">エクスポート</span>
            </button>
          </div>
        </div>
      </div>

      {/* セクションナビゲーション */}
      <div className="bg-white border-b border-gray-200 rounded-lg">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'overview', label: '概要', icon: BarChart3 },
            { key: 'profit', label: '利益分析', icon: DollarSign },
            { key: 'anomalies', label: '異常検知', icon: AlertTriangle }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeSection === key
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* アクティブセクション */}
      <div>
        {activeSection === 'overview' && renderOverviewSection()}
        {activeSection === 'profit' && renderProfitSection()}
        {activeSection === 'anomalies' && renderAnomaliesSection()}
      </div>
    </div>
  );
}