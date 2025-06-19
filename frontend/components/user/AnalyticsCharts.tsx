'use client';

import React, { useState } from 'react';
import { BarChart3, TrendingUp, MessageSquare, Coins, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AnalyticsData {
  chatCountPerDay: Array<{ date: string; count: number }>;
  tokenUsagePerDay: Array<{ date: string; amount: number }>;
  affinityProgress: Array<{ 
    characterName: string; 
    level: number; 
    color: string;
  }>;
}

interface AnalyticsChartsProps {
  analytics: AnalyticsData;
  locale: string;
}

export default function AnalyticsCharts({ analytics, locale }: AnalyticsChartsProps) {
  const t = useTranslations('analytics');
  const [activeChart, setActiveChart] = useState<'chats' | 'tokens' | 'affinity'>('chats');

  // チャート用の統計計算（undefinedチェック付き）
  const totalChats = analytics?.chatCountPerDay?.reduce((sum, item) => sum + item.count, 0) || 0;
  const totalTokens = analytics?.tokenUsagePerDay?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const averageChatsPerDay = Math.round(totalChats / Math.max(analytics?.chatCountPerDay?.length || 1, 1));
  const averageTokensPerDay = Math.round(totalTokens / Math.max(analytics?.tokenUsagePerDay?.length || 1, 1));

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };

  // 簡易バーチャート用の最大値計算
  const getMaxValue = (data: Array<{ count?: number; amount?: number }>) => {
    return Math.max(...data.map(item => item.count || item.amount || 0));
  };

  // バーチャートコンポーネント
  const SimpleBarChart = ({ 
    data, 
    valueKey, 
    color, 
    maxValue 
  }: { 
    data: any[]; 
    valueKey: string; 
    color: string; 
    maxValue: number;
  }) => (
    <div className="flex items-end justify-between space-x-1 h-32">
      {data.map((item, index) => {
        const height = maxValue > 0 ? (item[valueKey] / maxValue) * 100 : 0;
        return (
          <div key={index} className="flex flex-col items-center flex-1">
            <div className="w-full flex items-end justify-center h-24">
              <div
                className={`w-full max-w-8 rounded-t transition-all duration-300 hover:opacity-80`}
                style={{ 
                  height: `${height}%`, 
                  backgroundColor: color,
                  minHeight: height > 0 ? '4px' : '0px'
                }}
                title={`${formatDate(item.date)}: ${item[valueKey]}`}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1 text-center">
              {formatDate(item.date)}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
        </div>
        
        {/* 期間表示 */}
        <div className="flex items-center space-x-1 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{t('period.past7Days')}</span>
        </div>
      </div>

      {/* チャート切り替えタブ */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'chats', label: t('charts.chatCount'), icon: MessageSquare },
          { key: 'tokens', label: t('charts.tokenUsage'), icon: Coins },
          { key: 'affinity', label: t('charts.characterInteraction'), icon: TrendingUp }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveChart(tab.key as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              activeChart === tab.key
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* チャート表示エリア */}
      <div className="mb-6">
        {activeChart === 'chats' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">{t('charts.dailyChats')}</h4>
              <div className="text-sm text-gray-600">
{t('summary.averageDaily')}: {t('chats.perDay', { count: averageChatsPerDay })}
              </div>
            </div>
            <SimpleBarChart
              data={analytics?.chatCountPerDay || []}
              valueKey="count"
              color="#6366f1"
              maxValue={getMaxValue(analytics?.chatCountPerDay || [])}
            />
          </div>
        )}

        {activeChart === 'tokens' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">{locale === 'en' ? 'Daily Token Usage' : '日別トークン使用量'}</h4>
              <div className="text-sm text-gray-600">
{t('summary.averageDaily')}: {averageTokensPerDay}{locale === 'en' ? ' tokens/day' : 'トークン/日'}
              </div>
            </div>
            <SimpleBarChart
              data={analytics?.tokenUsagePerDay || []}
              valueKey="amount"
              color="#f59e0b"
              maxValue={getMaxValue(analytics?.tokenUsagePerDay || [])}
            />
          </div>
        )}

        {activeChart === 'affinity' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">{locale === 'en' ? 'Character Affinity Levels' : 'キャラクター別親密度'}</h4>
              <div className="text-sm text-gray-600">
                最高レベル: Lv.{analytics?.affinityProgress?.length > 0 ? Math.max(...(analytics?.affinityProgress || []).map(a => a.level)) : 0}
              </div>
            </div>
            
            {/* 親密度バーチャート */}
            <div className="space-y-4">
              {(analytics?.affinityProgress || []).map((character, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-20 text-sm font-medium text-gray-700 truncate">
                    {character.characterName}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Lv.{character.level}</span>
                      <span>{character.level}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="h-3 rounded-full transition-all duration-300"
                        style={{ 
                          backgroundColor: character.color,
                          width: `${(character.level / 100) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 統計サマリ */}
      <div className="pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{totalChats}</div>
            <div className="text-sm text-gray-600">{t('summary.totalChats')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{totalTokens.toLocaleString()}</div>
            <div className="text-sm text-gray-600">{t('summary.totalTokens')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {(analytics?.affinityProgress || []).length}
            </div>
            <div className="text-sm text-gray-600">{t('summary.interactedCharacters')}</div>
          </div>
        </div>
      </div>

    </div>
  );
}