'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getAuthHeaders } from '@/utils/auth';
import UserSidebar from '@/components/user/UserSidebar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Heart, TrendingUp, Gift, Star, Calendar, Users, Award, Target } from 'lucide-react';
import Image from 'next/image';

interface AffinityAnalyticsData {
  overallStats: {
    totalCharacters: number;
    averageLevel: number;
    highestLevel: number;
    totalGiftsGiven: number;
    totalInteractionDays: number;
    relationshipMilestones: number;
  };
  characterProgress: Array<{
    characterName: string;
    level: number;
    trustLevel: number;
    intimacyLevel: number;
    experience: number;
    relationshipType: string;
    emotionalState: string;
    color: string;
    firstInteraction: string;
    lastInteraction: string;
    totalConversations: number;
    currentStreak: number;
    maxStreak: number;
  }>;
  levelProgression: Array<{ date: string; [characterName: string]: number | string }>;
  trustCorrelation: Array<{ trust: number; intimacy: number; level: number; characterName: string }>;
  memoryTimeline: Array<{
    date: string;
    event: string;
    characterName: string;
    importance: number;
    type: 'gift' | 'milestone' | 'special' | 'conversation';
  }>;
  giftHistory: Array<{
    date: string;
    characterName: string;
    giftType: string;
    giftName: string;
    value: number;
    impact: number;
  }>;
  emotionalDevelopment: Array<{
    character: string;
    happy: number;
    excited: number;
    loving: number;
    shy: number;
    curious: number;
  }>;
  relationshipMilestones: Array<{
    characterName: string;
    milestone: string;
    achievedAt: string;
    level: number;
    description: string;
  }>;
}

export default function AffinityAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ja';
  const t = useTranslations('analytics');
  
  const [analyticsData, setAnalyticsData] = useState<AffinityAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('quarter');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('all');

  useEffect(() => {
    const fetchAffinityAnalytics = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/analytics/affinity?range=${timeRange}&character=${selectedCharacter}`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setAnalyticsData(data);
      } catch (error) {
        console.error('Affinity analytics fetch error:', error);
        // フォールバック: モックデータを使用
        setAnalyticsData(generateMockAffinityAnalytics());
      } finally {
        setIsLoading(false);
      }
    };

    fetchAffinityAnalytics();
  }, [timeRange, selectedCharacter]);

  const generateMockAffinityAnalytics = (): AffinityAnalyticsData => {
    const characters = [
      { name: 'ルナ', color: '#E91E63' },
      { name: 'ミコ', color: '#9C27B0' },
      { name: 'ゼン', color: '#2196F3' },
      { name: 'アリス', color: '#4CAF50' }
    ];

    const characterProgress = characters.map((char, index) => ({
      characterName: char.name,
      level: [67, 43, 28, 15][index],
      trustLevel: [85, 72, 45, 32][index],
      intimacyLevel: [78, 65, 38, 25][index],
      experience: [6700, 4300, 2800, 1500][index],
      relationshipType: ['close_friend', 'friend', 'acquaintance', 'stranger'][index],
      emotionalState: ['loving', 'happy', 'excited', 'curious'][index],
      color: char.color,
      firstInteraction: new Date(2024, index + 1, 15).toISOString(),
      lastInteraction: new Date().toISOString(),
      totalConversations: [156, 89, 67, 34][index],
      currentStreak: [8, 3, 1, 0][index],
      maxStreak: [15, 7, 5, 2][index]
    }));

    const levelProgression = [];
    for (let i = 89; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const entry: any = { date: date.toISOString().slice(0, 10) };
      
      characters.forEach((char, index) => {
        const baseLevel = characterProgress[index].level;
        const variation = Math.floor(Math.random() * 5) - 2;
        entry[char.name] = Math.max(0, baseLevel - Math.floor(i / 3) + variation);
      });
      
      levelProgression.push(entry);
    }

    const trustCorrelation = characters.map(char => {
      const charProgress = characterProgress.find(cp => cp.characterName === char.name)!;
      return {
        trust: charProgress.trustLevel,
        intimacy: charProgress.intimacyLevel,
        level: charProgress.level,
        characterName: char.name
      };
    });

    const memoryTimeline = [
      {
        date: '2025-01-05',
        event: 'ルナとの初めてのデート',
        characterName: 'ルナ',
        importance: 5,
        type: 'special' as const
      },
      {
        date: '2025-01-03',
        event: 'ミコへのプレゼント',
        characterName: 'ミコ',
        importance: 4,
        type: 'gift' as const
      },
      {
        date: '2024-12-25',
        event: 'ゼンとのクリスマス',
        characterName: 'ゼン',
        importance: 5,
        type: 'milestone' as const
      },
      {
        date: '2024-12-20',
        event: 'アリスとの深い会話',
        characterName: 'アリス',
        importance: 3,
        type: 'conversation' as const
      }
    ];

    const giftHistory = [
      {
        date: '2025-01-03',
        characterName: 'ミコ',
        giftType: 'flower',
        giftName: 'バラの花束',
        value: 500,
        impact: 8
      },
      {
        date: '2024-12-24',
        characterName: 'ルナ',
        giftType: 'jewelry',
        giftName: 'ネックレス',
        value: 1200,
        impact: 12
      },
      {
        date: '2024-12-15',
        characterName: 'ゼン',
        giftType: 'book',
        giftName: '詩集',
        value: 300,
        impact: 6
      }
    ];

    const emotionalDevelopment = characters.map(char => ({
      character: char.name,
      happy: Math.floor(Math.random() * 30) + 70,
      excited: Math.floor(Math.random() * 25) + 65,
      loving: Math.floor(Math.random() * 35) + 60,
      shy: Math.floor(Math.random() * 20) + 40,
      curious: Math.floor(Math.random() * 30) + 50
    }));

    const relationshipMilestones = [
      {
        characterName: 'ルナ',
        milestone: '親友レベル到達',
        achievedAt: '2024-11-15',
        level: 50,
        description: 'ルナとの関係が親友レベルに到達しました'
      },
      {
        characterName: 'ミコ',
        milestone: '信頼関係確立',
        achievedAt: '2024-10-20',
        level: 30,
        description: 'ミコからの信頼を得ることができました'
      },
      {
        characterName: 'ゼン',
        milestone: '初回ロック解除',
        achievedAt: '2024-09-10',
        level: 10,
        description: 'ゼンの特別な画像をアンロックしました'
      }
    ];

    return {
      overallStats: {
        totalCharacters: 4,
        averageLevel: Math.floor(characterProgress.reduce((sum, char) => sum + char.level, 0) / characterProgress.length),
        highestLevel: Math.max(...characterProgress.map(char => char.level)),
        totalGiftsGiven: giftHistory.length,
        totalInteractionDays: 127,
        relationshipMilestones: relationshipMilestones.length
      },
      characterProgress,
      levelProgression,
      trustCorrelation,
      memoryTimeline,
      giftHistory,
      emotionalDevelopment,
      relationshipMilestones
    };
  };

  const getRelationshipColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'stranger': '#94A3B8',
      'acquaintance': '#60A5FA',
      'friend': '#34D399',
      'close_friend': '#F59E0B',
      'best_friend': '#EF4444',
      'lover': '#EC4899',
      'soulmate': '#8B5CF6'
    };
    return colors[type] || '#94A3B8';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <UserSidebar locale={locale} />
      
      <div className="flex-1 lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ヘッダー */}
          <div className="mb-8">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/${locale}/dashboard`)}
                  className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <Image
                    src="/icon/arrow.svg"
                    alt="戻る"
                    width={20}
                    height={20}
                    className="transform rotate-180"
                  />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    親密度関係分析
                  </h1>
                  <p className="text-gray-600">
                    キャラクターとの関係性の深化と感情的なつながりを詳しく分析します
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={selectedCharacter}
                  onChange={(e) => setSelectedCharacter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">全キャラクター</option>
                  <option value="luna">ルナ</option>
                  <option value="miko">ミコ</option>
                  <option value="zen">ゼン</option>
                  <option value="alice">アリス</option>
                </select>
                
                <div className="flex gap-1">
                  {(['month', 'quarter', 'year'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        timeRange === range
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {range === 'month' ? '月間' : range === 'quarter' ? '四半期' : '年間'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ローディング状態 */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          )}

          {/* 分析データ表示 */}
          {!isLoading && analyticsData && (
            <>
              {/* 統計サマリーカード */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">キャラクター数</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.overallStats.totalCharacters}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">平均レベル</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.overallStats.averageLevel}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">最高レベル</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.overallStats.highestLevel}
                      </p>
                    </div>
                    <Star className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">ギフト贈呈数</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.overallStats.totalGiftsGiven}
                      </p>
                    </div>
                    <Gift className="w-8 h-8 text-pink-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">交流日数</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.overallStats.totalInteractionDays}日
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-purple-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">マイルストーン</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.overallStats.relationshipMilestones}
                      </p>
                    </div>
                    <Award className="w-8 h-8 text-indigo-600" />
                  </div>
                </div>
              </div>

              {/* メインチャートエリア */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* レベル進捗推移 */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">レベル進捗推移</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.levelProgression}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).getMonth() + 1 + '/' + new Date(value).getDate()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
                      />
                      <Line type="monotone" dataKey="ルナ" stroke="#E91E63" strokeWidth={2} />
                      <Line type="monotone" dataKey="ミコ" stroke="#9C27B0" strokeWidth={2} />
                      <Line type="monotone" dataKey="ゼン" stroke="#2196F3" strokeWidth={2} />
                      <Line type="monotone" dataKey="アリス" stroke="#4CAF50" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 信頼度と親密度の相関 */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">信頼度 vs 親密度</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={analyticsData.trustCorrelation}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="trust" name="信頼度" unit="%" />
                      <YAxis dataKey="intimacy" name="親密度" unit="%" />
                      <Tooltip 
                        formatter={(value, name) => [
                          value + '%', 
                          name === 'trust' ? '信頼度' : name === 'intimacy' ? '親密度' : 'レベル'
                        ]}
                        labelFormatter={(label: any, payload: any) => 
                          payload && payload[0] ? payload[0].payload.characterName : ''
                        }
                      />
                      <Scatter dataKey="level" fill="#8884d8" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* 感情状態レーダーチャート */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">感情状態分析</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={analyticsData.emotionalDevelopment}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="character" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Tooltip />
                      <Radar dataKey="happy" stroke="#FFC107" fill="#FFC107" fillOpacity={0.3} />
                      <Radar dataKey="loving" stroke="#E91E63" fill="#E91E63" fillOpacity={0.3} />
                      <Radar dataKey="excited" stroke="#FF5722" fill="#FF5722" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* キャラクター詳細進捗 */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">キャラクター別詳細</h3>
                  <div className="space-y-4">
                    {analyticsData.characterProgress.map((char, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-3"
                              style={{ backgroundColor: char.color }}
                            ></div>
                            <h4 className="font-semibold">{char.characterName}</h4>
                            <span 
                              className="ml-2 px-2 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: getRelationshipColor(char.relationshipType) }}
                            >
                              {char.relationshipType}
                            </span>
                          </div>
                          <span className="text-lg font-bold">Lv.{char.level}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">信頼度: </span>
                            <span className="font-medium">{char.trustLevel}%</span>
                          </div>
                          <div>
                            <span className="text-gray-600">親密度: </span>
                            <span className="font-medium">{char.intimacyLevel}%</span>
                          </div>
                          <div>
                            <span className="text-gray-600">現在ストリーク: </span>
                            <span className="font-medium">{char.currentStreak}日</span>
                          </div>
                          <div>
                            <span className="text-gray-600">最大ストリーク: </span>
                            <span className="font-medium">{char.maxStreak}日</span>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full"
                              style={{ 
                                width: `${(char.experience % 100)}%`,
                                backgroundColor: char.color 
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            EXP: {char.experience} / {Math.ceil(char.experience / 100) * 100}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 思い出タイムライン & ギフト履歴 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* 特別な思い出タイムライン */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">特別な思い出</h3>
                  <div className="space-y-4">
                    {analyticsData.memoryTimeline.map((memory, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className={`w-3 h-3 rounded-full mt-2 ${
                          memory.type === 'special' ? 'bg-pink-500' :
                          memory.type === 'gift' ? 'bg-green-500' :
                          memory.type === 'milestone' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{memory.event}</p>
                            <span className="text-xs text-gray-500">
                              {new Date(memory.date).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{memory.characterName}</p>
                          <div className="flex items-center mt-1">
                            {[...Array(memory.importance)].map((_, i) => (
                              <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* マイルストーン達成 */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">関係マイルストーン</h3>
                  <div className="space-y-4">
                    {analyticsData.relationshipMilestones.map((milestone, index) => (
                      <div key={index} className="border-l-4 border-purple-500 pl-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{milestone.milestone}</h4>
                          <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            Lv.{milestone.level}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{milestone.characterName}</p>
                        <p className="text-xs text-gray-500 mt-1">{milestone.description}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(milestone.achievedAt).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}