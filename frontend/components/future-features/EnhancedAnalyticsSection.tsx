'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Target, 
  Brain, 
  Award, 
  Calendar, 
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Heart,
  MessageCircle,
  Star,
  Trophy,
  Gift,
  Lightbulb,
  ChevronRight,
  Coins
} from 'lucide-react';

// 🎯 高度分析データ型定義
interface EnhancedAnalytics {
  insights: {
    personalizedRecommendations: Array<{
      type: 'token_optimization' | 'character_suggestion' | 'timing' | 'engagement';
      title: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      actionable: boolean;
    }>;
    predictions: {
      nextTokenPurchase: string;
      affinityGrowth: Array<{ characterId: string; name: string; predictedLevel: number; daysToNext: number }>;
      optimalChatTimes: Array<{ hour: number; engagement: number }>;
    };
    achievements: {
      recent: Array<{ name: string; description: string; unlockedAt: string; rarity: string }>;
      nextMilestones: Array<{ name: string; progress: number; target: number; estimatedDays: number }>;
    };
  };
  performance: {
    efficiency: {
      tokensPerMessage: number;
      conversationDepth: number;
      responseQuality: number;
      timeSpentOptimal: number;
    };
    engagement: {
      dailyStreak: number;
      weeklyActivity: number;
      monthlyGrowth: number;
      socialRank: number; // Anonymous ranking
    };
    relationships: {
      strongestBond: { characterId: string; name: string; level: number };
      mostImproved: { characterId: string; name: string; growth: number };
      totalCharacters: number;
      averageAffinity: number;
    };
  };
  trends: {
    tokenUsage: Array<{ date: string; amount: number; efficiency: number }>;
    affinityGrowth: Array<{ date: string; total: number; characters: Array<{ id: string; level: number }> }>;
    activityPattern: Array<{ hour: number; messages: number; quality: number }>;
  };
}

interface EnhancedAnalyticsSectionProps {
  userId: string;
  className?: string;
}

export default function EnhancedAnalyticsSection({ userId, className = '' }: EnhancedAnalyticsSectionProps) {
  const [analytics, setAnalytics] = useState<EnhancedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'insights' | 'performance' | 'trends'>('insights');

  // 🔄 高度分析データ取得
  const fetchEnhancedAnalytics = async () => {
    try {
      setLoading(true);
      
      // TODO: 実際のAPIエンドポイント実装
      // const response = await fetch(`/api/v1/user/enhanced-analytics`);
      // const data = await response.json();
      
      // モックデータで機能をデモンストレーション
      const mockAnalytics: EnhancedAnalytics = {
        insights: {
          personalizedRecommendations: [
            {
              type: 'token_optimization',
              title: 'トークン効率化のチャンス',
              description: '午後の時間帯での会話は通常より20%効率的です。この時間を活用することでトークンを節約できます。',
              impact: 'medium',
              actionable: true
            },
            {
              type: 'character_suggestion',
              title: '新しいキャラクターとの相性',
              description: 'あなたの会話パターンから、「ミコ」との相性が85%と予測されます。',
              impact: 'high',
              actionable: true
            },
            {
              type: 'timing',
              title: '最適な会話時間',
              description: '19:00-21:00の時間帯で最も質の高い会話ができています。',
              impact: 'low',
              actionable: false
            }
          ],
          predictions: {
            nextTokenPurchase: '7日後',
            affinityGrowth: [
              { characterId: '1', name: 'ルナ', predictedLevel: 25, daysToNext: 3 },
              { characterId: '2', name: 'ゼン', predictedLevel: 18, daysToNext: 5 }
            ],
            optimalChatTimes: [
              { hour: 19, engagement: 92 },
              { hour: 20, engagement: 88 },
              { hour: 21, engagement: 85 }
            ]
          },
          achievements: {
            recent: [
              { name: '会話マスター', description: '100回の会話を達成', unlockedAt: '2024-01-15', rarity: 'uncommon' },
              { name: '深い絆', description: 'キャラクターとの親密度レベル20達成', unlockedAt: '2024-01-12', rarity: 'rare' }
            ],
            nextMilestones: [
              { name: '毎日チャット', progress: 18, target: 30, estimatedDays: 12 },
              { name: 'トークンマスター', progress: 8500, target: 10000, estimatedDays: 15 }
            ]
          }
        },
        performance: {
          efficiency: {
            tokensPerMessage: 45.2,
            conversationDepth: 7.8,
            responseQuality: 92,
            timeSpentOptimal: 78
          },
          engagement: {
            dailyStreak: 12,
            weeklyActivity: 85,
            monthlyGrowth: 23,
            socialRank: 156
          },
          relationships: {
            strongestBond: { characterId: '1', name: 'ルナ', level: 24 },
            mostImproved: { characterId: '3', name: 'ロボ', growth: 150 },
            totalCharacters: 4,
            averageAffinity: 18.5
          }
        },
        trends: {
          tokenUsage: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6-i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            amount: Math.floor(Math.random() * 200) + 100,
            efficiency: Math.floor(Math.random() * 30) + 70
          })),
          affinityGrowth: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6-i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            total: Math.floor(Math.random() * 50) + 50,
            characters: [
              { id: '1', level: Math.floor(Math.random() * 5) + 20 },
              { id: '2', level: Math.floor(Math.random() * 5) + 15 }
            ]
          })),
          activityPattern: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            messages: Math.floor(Math.random() * 10) + (hour >= 7 && hour <= 22 ? 5 : 0),
            quality: Math.floor(Math.random() * 30) + 70
          }))
        }
      };

      setTimeout(() => {
        setAnalytics(mockAnalytics);
        setLoading(false);
      }, 500);

    } catch (error) {
      console.error('Enhanced analytics fetch error:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnhancedAnalytics();
  }, [userId]);

  // 🎨 影響度バッジ
  const getImpactBadge = (impact: string) => {
    const config = {
      high: { label: '高', color: 'bg-red-100 text-red-800' },
      medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
      low: { label: '低', color: 'bg-green-100 text-green-800' }
    };
    const impactConfig = config[impact as keyof typeof config];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${impactConfig.color}`}>
        {impactConfig.label}
      </span>
    );
  };

  // 🏆 レアリティバッジ
  const getRarityBadge = (rarity: string) => {
    const config = {
      common: { label: 'コモン', color: 'bg-gray-100 text-gray-800' },
      uncommon: { label: 'アンコモン', color: 'bg-blue-100 text-blue-800' },
      rare: { label: 'レア', color: 'bg-purple-100 text-purple-800' },
      legendary: { label: 'レジェンダリー', color: 'bg-yellow-100 text-yellow-800' }
    };
    const rarityConfig = config[rarity as keyof typeof config];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${rarityConfig.color}`}>
        {rarityConfig.label}
      </span>
    );
  };

  // 📊 インサイトセクション
  const renderInsightsSection = () => {
    if (!analytics) return null;

    return (
      <div className="space-y-6">
        {/* パーソナライズされた推奨事項 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
            パーソナライズされた推奨事項
          </h3>
          <div className="space-y-3">
            {analytics.insights.personalizedRecommendations.map((rec, index) => (
              <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  {getImpactBadge(rec.impact)}
                </div>
                <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                {rec.actionable && (
                  <button className="text-blue-600 text-sm hover:text-blue-800 flex items-center">
                    詳細を見る <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 予測情報 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Brain className="w-5 h-5 text-purple-500 mr-2" />
            AI予測
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">次回トークン購入予測</h4>
              <p className="text-2xl font-bold text-purple-600">{analytics.insights.predictions.nextTokenPurchase}</p>
              <p className="text-sm text-gray-500">現在の使用パターンに基づく</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">最適な会話時間</h4>
              <div className="space-y-1">
                {analytics.insights.predictions.optimalChatTimes.slice(0, 2).map((time, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{time.hour}:00-{time.hour + 1}:00</span>
                    <span className="text-green-600">{time.engagement}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 実績と進捗 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
            実績と進捗
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 最近の実績 */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">最近の実績</h4>
              <div className="space-y-2">
                {analytics.insights.achievements.recent.map((achievement, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{achievement.name}</p>
                        <p className="text-xs text-gray-500">{achievement.description}</p>
                      </div>
                    </div>
                    {getRarityBadge(achievement.rarity)}
                  </div>
                ))}
              </div>
            </div>

            {/* 次のマイルストーン */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">次のマイルストーン</h4>
              <div className="space-y-3">
                {analytics.insights.achievements.nextMilestones.map((milestone, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-900">{milestone.name}</span>
                      <span className="text-gray-500">{milestone.estimatedDays}日後</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${(milestone.progress / milestone.target) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {milestone.progress.toLocaleString()} / {milestone.target.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 📈 パフォーマンスセクション
  const renderPerformanceSection = () => {
    if (!analytics) return null;

    return (
      <div className="space-y-6">
        {/* 効率性指標 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="w-5 h-5 text-blue-500 mr-2" />
            効率性指標
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <Coins className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analytics.performance.efficiency.tokensPerMessage}</p>
              <p className="text-sm text-gray-500">トークン/メッセージ</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <MessageCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analytics.performance.efficiency.conversationDepth}</p>
              <p className="text-sm text-gray-500">会話の深さ</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analytics.performance.efficiency.responseQuality}%</p>
              <p className="text-sm text-gray-500">応答品質</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <Clock className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analytics.performance.efficiency.timeSpentOptimal}%</p>
              <p className="text-sm text-gray-500">最適時間率</p>
            </div>
          </div>
        </div>

        {/* エンゲージメント */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 text-green-500 mr-2" />
            エンゲージメント
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <Calendar className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analytics.performance.engagement.dailyStreak}</p>
              <p className="text-sm text-gray-500">連続日数</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <BarChart3 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analytics.performance.engagement.weeklyActivity}%</p>
              <p className="text-sm text-gray-500">週間活動率</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">+{analytics.performance.engagement.monthlyGrowth}%</p>
              <p className="text-sm text-gray-500">月間成長率</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">#{analytics.performance.engagement.socialRank}</p>
              <p className="text-sm text-gray-500">コミュニティ順位</p>
            </div>
          </div>
        </div>

        {/* 関係性統計 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Heart className="w-5 h-5 text-pink-500 mr-2" />
            関係性統計
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">最強の絆</h4>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{analytics.performance.relationships.strongestBond.name}</p>
                  <p className="text-sm text-gray-500">レベル {analytics.performance.relationships.strongestBond.level}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">最も成長したキャラクター</h4>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{analytics.performance.relationships.mostImproved.name}</p>
                  <p className="text-sm text-gray-500">+{analytics.performance.relationships.mostImproved.growth}% 成長</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Brain className="w-6 h-6 text-purple-500 mr-2" />
          AI駆動インサイト
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          あなたの活動パターンから生成されたパーソナライズされた分析
        </p>
      </div>

      {/* タブナビゲーション */}
      <div className="px-6 py-3 border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'insights', label: 'インサイト', icon: Lightbulb },
            { key: 'performance', label: 'パフォーマンス', icon: Target },
            { key: 'trends', label: 'トレンド', icon: TrendingUp }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center space-x-2 pb-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === key
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* コンテンツ */}
      <div className="p-6">
        {activeTab === 'insights' && renderInsightsSection()}
        {activeTab === 'performance' && renderPerformanceSection()}
        {activeTab === 'trends' && (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">トレンド分析は準備中です</p>
          </div>
        )}
      </div>
    </div>
  );
}