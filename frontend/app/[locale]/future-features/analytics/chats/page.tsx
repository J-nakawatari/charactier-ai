'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import UserSidebar from '@/components/user/UserSidebar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { MessageCircle, Clock, TrendingUp, Heart, Calendar, Zap, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

interface ChatAnalyticsData {
  conversationStats: {
    totalConversations: number;
    averageLength: number;
    longestStreak: number;
    currentStreak: number;
    totalMessages: number;
    averageDaily: number;
  };
  dailyActivity: Array<{ date: string; conversations: number; messages: number; duration: number }>;
  characterInteraction: Array<{ 
    characterName: string; 
    conversations: number; 
    averageLength: number; 
    emotionalState: string;
    color: string;
  }>;
  timePatterns: Array<{ hour: string; conversations: number; averageLength: number }>;
  emotionalJourney: Array<{ date: string; happiness: number; excitement: number; affection: number }>;
  streakHistory: Array<{ date: string; streak: number; active: boolean }>;
  conversationDepth: Array<{ range: string; count: number; percentage: number }>;
}

export default function ChatAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ja';
  const t = useTranslations('analytics');
  
  const [analyticsData, setAnalyticsData] = useState<ChatAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    // 現在は未実装のため、空データを設定
    setIsLoading(true);
    setTimeout(() => {
      setAnalyticsData(null); // 未実装状態を示すためにnullを設定
      setIsLoading(false);
    }, 500);
  }, [timeRange]);

  const generateMockChatAnalytics = (): ChatAnalyticsData => {
    const dailyActivity = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dailyActivity.push({
        date: date.toISOString().slice(0, 10),
        conversations: Math.floor(Math.random() * 8) + 2,
        messages: Math.floor(Math.random() * 40) + 10,
        duration: Math.floor(Math.random() * 60) + 15
      });
    }

    const characterInteraction = [
      { 
        characterName: 'ルナ', 
        conversations: 45, 
        averageLength: 18.5, 
        emotionalState: 'happy',
        color: '#E95295' 
      },
      { 
        characterName: 'ミコ', 
        conversations: 32, 
        averageLength: 15.2, 
        emotionalState: 'excited',
        color: '#9C27B0' 
      },
      { 
        characterName: 'ゼン', 
        conversations: 28, 
        averageLength: 22.1, 
        emotionalState: 'loving',
        color: '#2196F3' 
      },
      { 
        characterName: 'アリス', 
        conversations: 19, 
        averageLength: 12.8, 
        emotionalState: 'curious',
        color: '#4CAF50' 
      }
    ];

    const timePatterns = [];
    for (let hour = 0; hour < 24; hour++) {
      const baseConv = hour >= 19 && hour <= 23 ? 8 : 
                      hour >= 12 && hour <= 18 ? 6 : 
                      hour >= 7 && hour <= 11 ? 4 : 2;
      timePatterns.push({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        conversations: baseConv + Math.floor(Math.random() * 3),
        averageLength: Math.floor(Math.random() * 10) + 15
      });
    }

    const emotionalJourney = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      emotionalJourney.push({
        date: date.toISOString().slice(0, 10),
        happiness: Math.floor(Math.random() * 30) + 70,
        excitement: Math.floor(Math.random() * 40) + 60,
        affection: Math.floor(Math.random() * 25) + 65
      });
    }

    const streakHistory = [];
    let currentStreakValue = 0;
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const hasActivity = Math.random() > 0.2;
      
      if (hasActivity) {
        currentStreakValue++;
      } else {
        currentStreakValue = 0;
      }
      
      streakHistory.push({
        date: date.toISOString().slice(0, 10),
        streak: currentStreakValue,
        active: hasActivity
      });
    }

    const conversationDepth = [
      { range: '1-5メッセージ', count: 15, percentage: 25 },
      { range: '6-15メッセージ', count: 25, percentage: 42 },
      { range: '16-30メッセージ', count: 12, percentage: 20 },
      { range: '31+メッセージ', count: 8, percentage: 13 }
    ];

    return {
      conversationStats: {
        totalConversations: 124,
        averageLength: 17.3,
        longestStreak: 12,
        currentStreak: 5,
        totalMessages: 2148,
        averageDaily: 4.1
      },
      dailyActivity,
      characterInteraction,
      timePatterns,
      emotionalJourney,
      streakHistory,
      conversationDepth
    };
  };

  const EMOTION_COLORS = {
    happiness: '#FFC107',
    excitement: '#FF5722',
    affection: '#E95295'
  };

  const DEPTH_COLORS = ['#81C784', '#64B5F6', '#FFB74D', '#F06292'];

  return (
    <div className="min-h-dvh bg-gray-50 flex">
      <UserSidebar locale={locale} />
      
      <div className="flex-1 lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ヘッダー */}
          <div className="mb-8">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
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
                    チャット活動分析
                  </h1>
                  <p className="text-gray-600">
                    あなたの会話パターンと感情的なつながりを詳しく分析します
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {(['week', 'month', 'quarter'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timeRange === range
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {range === 'week' ? '週間' : range === 'month' ? '月間' : '四半期'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ローディング状態 */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          )}

          {/* 未実装機能の表示 */}
          {!isLoading && !analyticsData && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">🚧</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">チャット分析機能は準備中です</h3>
              <p className="text-gray-600 mb-6">
                詳細なチャット分析機能は現在開発中です。<br />
                基本的なチャット履歴はダッシュボードでご確認いただけます。
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push(`/${locale}/dashboard`)}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  ダッシュボードに戻る
                </button>
                <button
                  onClick={() => router.push(`/${locale}/characters`)}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  キャラクターと話す
                </button>
              </div>
            </div>
          )}

          {/* 分析データ表示 */}
          {!isLoading && analyticsData && (
            <>
              {/* 統計サマリーカード */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">総会話数</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.conversationStats.totalConversations}
                      </p>
                    </div>
                    <MessageCircle className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">平均会話長</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.conversationStats.averageLength}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">現在のストリーク</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.conversationStats.currentStreak}日
                      </p>
                    </div>
                    <Zap className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">最長ストリーク</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.conversationStats.longestStreak}日
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">総メッセージ数</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.conversationStats.totalMessages}
                      </p>
                    </div>
                    <Heart className="w-8 h-8 text-pink-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">日平均会話数</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.conversationStats.averageDaily}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-indigo-600" />
                  </div>
                </div>
              </div>

              {/* メインチャートエリア */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* 日次活動パターン */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">日次活動パターン</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analyticsData.dailyActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).getMonth() + 1 + '/' + new Date(value).getDate()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
                        formatter={(value, name) => [
                          value, 
                          name === 'conversations' ? '会話数' : 
                          name === 'messages' ? 'メッセージ数' : '平均時間(分)'
                        ]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="conversations" 
                        stackId="1"
                        stroke="#8884d8" 
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* キャラクター別インタラクション */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">キャラクター別会話分析</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.characterInteraction}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="characterName" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [value, name === 'conversations' ? '会話数' : '平均長さ']} />
                      <Bar dataKey="conversations" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {analyticsData.characterInteraction.map((char, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: char.color }}
                          ></div>
                          <span className="text-sm font-medium">{char.characterName}</span>
                          <span className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                            {char.emotionalState}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">{char.averageLength}分</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 時間帯別パターン */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">時間帯別会話パターン</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.timePatterns}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [value, name === 'conversations' ? '会話数' : '平均長さ(分)']} />
                      <Line 
                        type="monotone" 
                        dataKey="conversations" 
                        stroke="#FF6B6B" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 感情的な変化 */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">感情状態の変化</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.emotionalJourney}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).getMonth() + 1 + '/' + new Date(value).getDate()}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
                        formatter={(value, name) => [
                          value + '%', 
                          name === 'happiness' ? '幸福度' : 
                          name === 'excitement' ? '興奮度' : '愛情度'
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="happiness" 
                        stroke={EMOTION_COLORS.happiness}
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="excitement" 
                        stroke={EMOTION_COLORS.excitement}
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="affection" 
                        stroke={EMOTION_COLORS.affection}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* ストリーク履歴 */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">連続ログインストリーク</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analyticsData.streakHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).getMonth() + 1 + '/' + new Date(value).getDate()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
                        formatter={(value) => [value + '日', 'ストリーク']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="streak" 
                        stroke="#4ECDC4" 
                        fill="#4ECDC4"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 会話の深さ分布 */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">会話の深さ分布</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.conversationDepth}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {analyticsData.conversationDepth.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DEPTH_COLORS[index % DEPTH_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value + ' 回', 'conversations']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {analyticsData.conversationDepth.map((depth, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: DEPTH_COLORS[index % DEPTH_COLORS.length] }}
                          ></div>
                          <span className="text-sm text-gray-700">{depth.range}</span>
                        </div>
                        <span className="text-sm font-medium">{depth.percentage}%</span>
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