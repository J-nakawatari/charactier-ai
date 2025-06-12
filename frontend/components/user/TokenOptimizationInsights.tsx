'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb,
  Clock,
  Coins,
  BarChart3,
  PieChart,
  Calendar,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// 🎯 トークン最適化データ型
interface TokenOptimization {
  currentEfficiency: number;
  potentialSavings: {
    monthly: number;
    percentage: number;
  };
  recommendations: Array<{
    type: 'timing' | 'character' | 'pattern' | 'budget';
    title: string;
    description: string;
    impact: number; // 節約可能トークン数
    difficulty: 'easy' | 'medium' | 'hard';
    actionable: boolean;
  }>;
  predictions: {
    nextPurchaseDate: string;
    suggestedAmount: number;
    budgetAlert: boolean;
  };
  patterns: {
    optimalTimes: Array<{ hour: number; efficiency: number }>;
    spendingTrend: Array<{ date: string; amount: number; predicted: number }>;
    characterEfficiency: Array<{ name: string; efficiency: number; cost: number }>;
  };
}

interface TokenOptimizationInsightsProps {
  timeRange: 'week' | 'month' | 'quarter';
  className?: string;
}

export default function TokenOptimizationInsights({ timeRange, className = '' }: TokenOptimizationInsightsProps) {
  const [optimization, setOptimization] = useState<TokenOptimization | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecommendation, setSelectedRecommendation] = useState<number | null>(null);

  // 🔄 最適化データ取得
  const fetchOptimizationData = async () => {
    try {
      setLoading(true);
      
      // TODO: 実際のAPIエンドポイント実装
      // const response = await fetch(`/api/analytics/token-optimization?range=${timeRange}`);
      // const data = await response.json();
      
      // モックデータ
      const mockOptimization: TokenOptimization = {
        currentEfficiency: 78,
        potentialSavings: {
          monthly: 450,
          percentage: 18
        },
        recommendations: [
          {
            type: 'timing',
            title: '最適な時間帯での会話',
            description: '19:00-21:00の時間帯で会話すると、平均20%効率が向上します',
            impact: 280,
            difficulty: 'easy',
            actionable: true
          },
          {
            type: 'character',
            title: 'より効率的なキャラクター選択',
            description: 'ルナとの会話は他のキャラクターより15%効率的です',
            impact: 120,
            difficulty: 'medium',
            actionable: true
          },
          {
            type: 'pattern',
            title: '会話パターンの最適化',
            description: '短時間で密度の高い会話を心がけることで効率が向上します',
            impact: 200,
            difficulty: 'hard',
            actionable: false
          },
          {
            type: 'budget',
            title: 'トークン購入タイミング',
            description: '月初の購入で5%のボーナストークンを獲得できます',
            impact: 100,
            difficulty: 'easy',
            actionable: true
          }
        ],
        predictions: {
          nextPurchaseDate: '2024-02-15',
          suggestedAmount: 2000,
          budgetAlert: false
        },
        patterns: {
          optimalTimes: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            efficiency: Math.max(30, 90 - Math.abs(hour - 20) * 4 + Math.random() * 10)
          })),
          spendingTrend: Array.from({ length: 14 }, (_, i) => ({
            date: new Date(Date.now() - (13-i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            amount: Math.floor(Math.random() * 200) + 100,
            predicted: Math.floor(Math.random() * 50) + 120
          })),
          characterEfficiency: [
            { name: 'ルナ', efficiency: 85, cost: 42 },
            { name: 'ミコ', efficiency: 78, cost: 48 },
            { name: 'ゼン', efficiency: 82, cost: 45 },
            { name: 'ロボ', efficiency: 74, cost: 52 }
          ]
        }
      };

      setTimeout(() => {
        setOptimization(mockOptimization);
        setLoading(false);
      }, 500);

    } catch (error) {
      console.error('Token optimization fetch error:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptimizationData();
  }, [timeRange]);

  // 🎨 難易度バッジ
  const getDifficultyBadge = (difficulty: string) => {
    const config = {
      easy: { label: '簡単', color: 'bg-green-100 text-green-800' },
      medium: { label: '普通', color: 'bg-yellow-100 text-yellow-800' },
      hard: { label: '難しい', color: 'bg-red-100 text-red-800' }
    };
    const difficultyConfig = config[difficulty as keyof typeof config];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${difficultyConfig.color}`}>
        {difficultyConfig.label}
      </span>
    );
  };

  // 🎯 推奨アイコン
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'timing':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'character':
        return <Target className="w-5 h-5 text-purple-500" />;
      case 'pattern':
        return <BarChart3 className="w-5 h-5 text-green-500" />;
      case 'budget':
        return <Coins className="w-5 h-5 text-yellow-500" />;
      default:
        return <Lightbulb className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!optimization) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <p className="text-gray-500 text-center">最適化データを読み込めませんでした</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Zap className="w-6 h-6 text-yellow-500 mr-2" />
          トークン最適化インサイト
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          AI分析による個人向け最適化提案
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">現在の効率</p>
                <p className="text-2xl font-bold text-blue-900">{optimization.currentEfficiency}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-blue-600 mt-2">
              {optimization.currentEfficiency >= 80 ? '非常に良い' : 
               optimization.currentEfficiency >= 60 ? '良好' : '改善が必要'}
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">節約可能</p>
                <p className="text-2xl font-bold text-green-900">{optimization.potentialSavings.monthly}</p>
                <p className="text-xs text-green-600">トークン/月</p>
              </div>
              <TrendingDown className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">次回購入予測</p>
                <p className="text-lg font-bold text-purple-900">
                  {new Date(optimization.predictions.nextPurchaseDate).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
                </p>
                <p className="text-xs text-purple-600">{optimization.predictions.suggestedAmount}トークン推奨</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* 最適化推奨事項 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
            最適化推奨事項
          </h3>
          <div className="space-y-3">
            {optimization.recommendations.map((rec, index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  selectedRecommendation === index 
                    ? 'border-purple-200 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedRecommendation(selectedRecommendation === index ? null : index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getRecommendationIcon(rec.type)}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{rec.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      
                      {selectedRecommendation === index && (
                        <div className="mt-3 p-3 bg-white rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">予想節約効果</span>
                            <span className="text-lg font-bold text-green-600">{rec.impact} トークン</span>
                          </div>
                          {rec.actionable && (
                            <button className="w-full mt-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors">
                              この提案を適用する
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {getDifficultyBadge(rec.difficulty)}
                    <div className="flex items-center text-sm text-green-600">
                      <Coins className="w-4 h-4 mr-1" />
                      {rec.impact}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 時間別効率パターン */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">最適な時間帯</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={optimization.patterns.optimalTimes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(hour) => `${hour}:00`}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(hour) => `${hour}:00`}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, '効率']}
                />
                <Bar 
                  dataKey="efficiency" 
                  fill="#8b5cf6"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            濃い紫色の時間帯がより効率的な会話時間です
          </p>
        </div>

        {/* キャラクター別効率 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">キャラクター別効率</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {optimization.patterns.characterEfficiency.map((char, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{char.name}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">効率</span>
                    <span className={`font-medium ${
                      char.efficiency >= 80 ? 'text-green-600' : 
                      char.efficiency >= 70 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {char.efficiency}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">平均コスト</span>
                    <span className="font-medium text-gray-900">{char.cost} トークン</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        char.efficiency >= 80 ? 'bg-green-500' : 
                        char.efficiency >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${char.efficiency}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}