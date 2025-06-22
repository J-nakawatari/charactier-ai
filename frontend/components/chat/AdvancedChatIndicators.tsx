'use client';

import { 
  Brain, 
  Database
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCharacterState } from '@/hooks/useCharacterState';
import { getMoodIcon, getMoodIconColor, getMoodLabel } from '@/utils/moodUtils';

// 🎭 ムード・口調・キャッシュ状態の高度表示
interface AdvancedChatIndicatorsProps {
  characterId: string;
  affinityLevel: number;
  currentMood?: string;
  className?: string;
}

export default function AdvancedChatIndicators({ 
  characterId, 
  affinityLevel, 
  currentMood,
  className = '' 
}: AdvancedChatIndicatorsProps) {
  const { characterState, loading } = useCharacterState(characterId, affinityLevel);
  const t = useTranslations('moods');

  // ⚡ キャッシュ状態の色取得
  const getCacheStatusColor = (isHit: boolean, responseTime: number) => {
    if (!isHit) return 'text-red-500';
    if (responseTime < 100) return 'text-green-500';
    if (responseTime < 500) return 'text-yellow-500';
    return 'text-orange-500';
  };

  // 📊 性格変化率の色取得
  const getPersonalityColor = (shift: number) => {
    if (shift < 20) return 'text-blue-500';
    if (shift < 50) return 'text-green-500';
    if (shift < 80) return 'text-yellow-500';
    return 'text-purple-500';
  };


  if (loading || !characterState) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-pulse flex space-x-2">
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* メインインジケーター */}
      <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 border border-gray-200/50">
        {/* ムード表示 */}
        <div 
          className="flex items-center space-x-1 cursor-pointer hover:bg-gray-100/50 rounded px-1 py-0.5 transition-colors group relative"
          title={`ムード: ${getMoodLabel(currentMood || characterState?.mood || 'neutral', (key: string) => t(key))} - 親密度 ${affinityLevel} に応じた感情状態`}
        >
          {(() => {
            const moodToShow = currentMood || characterState?.mood || 'neutral';
            const IconComponent = getMoodIcon(moodToShow);
            const colorClass = getMoodIconColor(moodToShow);
            return <IconComponent className={`w-4 h-4 ${colorClass}`} />;
          })()}
          <span className="text-xs text-gray-600 hidden sm:inline">
            {getMoodLabel(currentMood || characterState?.mood || 'neutral', (key: string) => t(key))}
          </span>
          
          {/* ツールチップ */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
            ムード: {getMoodLabel(currentMood || characterState?.mood || 'neutral', (key: string) => t(key))}
            <br />
            親密度 {affinityLevel} に応じた感情状態
          </div>
        </div>

        {/* セパレーター */}
        <div className="w-px h-4 bg-gray-300"></div>

        {/* キャッシュ状態 */}
        <div 
          className="flex items-center space-x-1 cursor-pointer hover:bg-gray-100/50 rounded px-1 py-0.5 transition-colors group relative"
        >
          <Database className={`w-4 h-4 ${getCacheStatusColor(characterState.cacheStatus.isHit, characterState.cacheStatus.responseTime)}`} />
          <span className="text-xs text-gray-600 hidden sm:inline">
            {characterState.cacheStatus.responseTime}ms
          </span>
          
          {/* ツールチップ */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
            キャッシュ: {characterState.cacheStatus.isHit ? 'ヒット' : 'ミス'}
            <br />
            応答時間: {characterState.cacheStatus.responseTime}ms
            <br />
            キャッシュ年齢: {Math.floor(characterState.cacheStatus.cacheAge / 60)}分
          </div>
        </div>

        {/* セパレーター */}
        <div className="w-px h-4 bg-gray-300"></div>

        {/* 性格変化率 */}
        <div 
          className="flex items-center space-x-1 cursor-pointer hover:bg-gray-100/50 rounded px-1 py-0.5 transition-colors group relative"
        >
          <Brain className={`w-4 h-4 ${getPersonalityColor(characterState.personalityShift)}`} />
          <span className="text-xs text-gray-600 hidden sm:inline">
            {characterState.personalityShift.toFixed(0)}%
          </span>
          
          {/* ツールチップ */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
            口調: {characterState.tone}
            <br />
            性格変化率: {characterState.personalityShift.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}