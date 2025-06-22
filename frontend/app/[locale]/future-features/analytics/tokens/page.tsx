'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import UserSidebar from '@/components/user/UserSidebar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, Clock, Users, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

interface TokenAnalyticsData {
  dailyUsage: Array<{ date: string; amount: number; count: number }>;
  weeklyTrend: Array<{ week: string; amount: number; efficiency: number }>;
  monthlyTrend: Array<{ month: string; amount: number; averageDaily: number }>;
  characterUsage: Array<{ characterName: string; amount: number; percentage: number; color: string }>;
  hourlyPattern: Array<{ hour: string; amount: number; sessions: number }>;
  efficiency: {
    tokensPerMessage: number;
    averageSessionLength: number;
    peakHour: string;
    mostEfficientCharacter: string;
  };
}

export default function TokenAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ja';
  const t = useTranslations('analytics');
  
  const [analyticsData, setAnalyticsData] = useState<TokenAnalyticsData | null>(null);
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

  const generateMockTokenAnalytics = (): TokenAnalyticsData => {
    const dailyUsage = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dailyUsage.push({
        date: date.toISOString().slice(0, 10),
        amount: Math.floor(Math.random() * 500) + 200,
        count: Math.floor(Math.random() * 15) + 5
      });
    }

    const weeklyTrend = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weeklyTrend.push({
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        amount: Math.floor(Math.random() * 3000) + 1500,
        efficiency: Math.floor(Math.random() * 30) + 40
      });
    }

    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthlyAmount = Math.floor(Math.random() * 8000) + 6000;
      monthlyTrend.push({
        month: `${month.getFullYear()}/${month.getMonth() + 1}`,
        amount: monthlyAmount,
        averageDaily: Math.floor(monthlyAmount / 30)
      });
    }

    const characterUsage = [
      { characterName: 'ルナ', amount: 4850, percentage: 45, color: '#E95295' },
      { characterName: 'ミコ', amount: 3240, percentage: 30, color: '#9C27B0' },
      { characterName: 'ゼン', amount: 1620, percentage: 15, color: '#2196F3' },
      { characterName: 'アリス', amount: 1080, percentage: 10, color: '#4CAF50' }
    ];

    const hourlyPattern = [];
    for (let hour = 0; hour < 24; hour++) {
      const baseAmount = hour >= 19 && hour <= 23 ? 200 : 
                       hour >= 12 && hour <= 18 ? 150 : 
                       hour >= 7 && hour <= 11 ? 100 : 50;
      hourlyPattern.push({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        amount: baseAmount + Math.floor(Math.random() * 100),
        sessions: Math.floor((baseAmount / 50) * (Math.random() * 2 + 1))
      });
    }

    return {
      dailyUsage,
      weeklyTrend,
      monthlyTrend,
      characterUsage,
      hourlyPattern,
      efficiency: {
        tokensPerMessage: 23.4,
        averageSessionLength: 18.7,
        peakHour: '21:00',
        mostEfficientCharacter: 'ゼン'
      }
    };
  };

  const COLORS = ['#E95295', '#9C27B0', '#2196F3', '#4CAF50', '#FF9800', '#F44336'];

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
                    トークン使用分析
                  </h1>
                  <p className="text-gray-600">
                    あなたのトークン使用パターンと効率性を詳しく分析します
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
              <h3 className="text-xl font-semibold text-gray-900 mb-2">トークン分析機能は準備中です</h3>
              <p className="text-gray-600 mb-6">
                詳細なトークン使用分析機能は現在開発中です。<br />
                基本的なトークン情報はダッシュボードでご確認いただけます。
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
              {/* 効率性指標カード */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">メッセージ当たりトークン</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.efficiency.tokensPerMessage}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">平均セッション長</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.efficiency.averageSessionLength}分
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">ピーク時間</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.efficiency.peakHour}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-purple-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">最効率キャラクター</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.efficiency.mostEfficientCharacter}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-pink-600" />
                  </div>
                </div>
              </div>

              {/* グラフエリア */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* 日次使用量推移 */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">日次トークン使用量推移</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.dailyUsage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).getMonth() + 1 + '/' + new Date(value).getDate()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
                        formatter={(value, name) => [value, name === 'amount' ? 'トークン' : 'メッセージ数']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="amount"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* キャラクター別使用量 */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">キャラクター別使用量</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.characterUsage}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="amount"
                      >
                        {analyticsData.characterUsage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value + ' トークン', 'usage']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {analyticsData.characterUsage.map((char, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: char.color }}
                          ></div>
                          <span className="text-sm text-gray-700">{char.characterName}</span>
                        </div>
                        <span className="text-sm font-medium">{char.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 時間帯別パターン */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">時間帯別使用パターン</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.hourlyPattern}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [value, name === 'amount' ? 'トークン' : 'セッション数']} />
                      <Bar dataKey="amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 週次効率性トレンド */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">週次効率性トレンド</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.weeklyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [value, name === 'efficiency' ? '効率性スコア' : 'トークン']} />
                      <Line 
                        type="monotone" 
                        dataKey="efficiency" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        name="efficiency"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}