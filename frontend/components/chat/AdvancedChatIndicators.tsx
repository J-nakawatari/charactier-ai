'use client';

import { useState } from 'react';
import { 
  Brain, 
  Activity, 
  Database, 
  Clock, 
  Info
} from 'lucide-react';
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
  const [showDetails, setShowDetails] = useState(false);
  const { characterState, loading, refetch } = useCharacterState(characterId, affinityLevel);

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
    <div className={`relative ${className}`}>
      {/* メインインジケーター */}
      <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 border border-gray-200/50">
        {/* ムード表示 */}
        <div 
          className="flex items-center space-x-1 cursor-pointer hover:bg-gray-100/50 rounded px-1 py-0.5 transition-colors"
          title={`ムード: ${getMoodLabel(currentMood || characterState?.mood || 'neutral')}`}
        >
          {(() => {
            const moodToShow = currentMood || characterState?.mood || 'neutral';
            const IconComponent = getMoodIcon(moodToShow);
            const colorClass = getMoodIconColor(moodToShow);
            return <IconComponent className={`w-4 h-4 ${colorClass}`} />;
          })()}
          <span className="text-xs text-gray-600 hidden sm:inline">
            {getMoodLabel(currentMood || characterState?.mood || 'neutral')}
          </span>
        </div>

        {/* セパレーター */}
        <div className="w-px h-4 bg-gray-300"></div>

        {/* キャッシュ状態 */}
        <div 
          className="flex items-center space-x-1 cursor-pointer hover:bg-gray-100/50 rounded px-1 py-0.5 transition-colors"
          title={`キャッシュ: ${characterState.cacheStatus.isHit ? 'ヒット' : 'ミス'} (${characterState.cacheStatus.responseTime}ms)`}
        >
          <Database className={`w-4 h-4 ${getCacheStatusColor(characterState.cacheStatus.isHit, characterState.cacheStatus.responseTime)}`} />
          <span className="text-xs text-gray-600 hidden sm:inline">
            {characterState.cacheStatus.responseTime}ms
          </span>
        </div>

        {/* セパレーター */}
        <div className="w-px h-4 bg-gray-300"></div>

        {/* 性格変化率 */}
        <div 
          className="flex items-center space-x-1 cursor-pointer hover:bg-gray-100/50 rounded px-1 py-0.5 transition-colors"
          title={`性格変化: ${characterState.personalityShift.toFixed(0)}%`}
        >
          <Brain className={`w-4 h-4 ${getPersonalityColor(characterState.personalityShift)}`} />
          <span className="text-xs text-gray-600 hidden sm:inline">
            {characterState.personalityShift.toFixed(0)}%
          </span>
        </div>

        {/* 詳細表示ボタン */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-0.5 hover:bg-gray-100/50 rounded transition-colors"
          title="詳細表示"
        >
          <Info className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* 詳細パネル */}
      {showDetails && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="space-y-3">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">キャラクター詳細状態</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* ムード詳細 */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {(() => {
                  const moodToShow = currentMood || characterState?.mood || 'neutral';
                  const IconComponent = getMoodIcon(moodToShow);
                  const colorClass = getMoodIconColor(moodToShow);
                  return <IconComponent className={`w-4 h-4 ${colorClass}`} />;
                })()}
                <span className="text-sm font-medium text-gray-700">現在のムード</span>
              </div>
              <div className="text-sm text-gray-600 ml-6">
                {getMoodLabel(currentMood || characterState?.mood || 'neutral')} - 親密度 {affinityLevel} に応じた感情状態
              </div>
            </div>

            {/* 口調・性格 */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Brain className={`w-4 h-4 ${getPersonalityColor(characterState.personalityShift)}`} />
                <span className="text-sm font-medium text-gray-700">口調・性格</span>
              </div>
              <div className="text-sm text-gray-600 ml-6">
                <div>口調: <span className="font-medium">{characterState.tone}</span></div>
                <div>性格変化率: <span className="font-medium">{characterState.personalityShift.toFixed(1)}%</span></div>
              </div>
            </div>

            {/* キャッシュ状態 */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Database className={`w-4 h-4 ${getCacheStatusColor(characterState.cacheStatus.isHit, characterState.cacheStatus.responseTime)}`} />
                <span className="text-sm font-medium text-gray-700">キャッシュ状態</span>
              </div>
              <div className="text-sm text-gray-600 ml-6">
                <div>状態: <span className={`font-medium ${characterState.cacheStatus.isHit ? 'text-green-600' : 'text-red-600'}`}>
                  {characterState.cacheStatus.isHit ? 'キャッシュヒット' : 'キャッシュミス'}
                </span></div>
                <div>応答時間: <span className="font-medium">{characterState.cacheStatus.responseTime}ms</span></div>
                <div>キャッシュ年齢: <span className="font-medium">{Math.floor(characterState.cacheStatus.cacheAge / 60)}分</span></div>
              </div>
            </div>


            {/* 更新ボタン */}
            <div className="pt-2 border-t border-gray-200">
              <button
                onClick={refetch}
                className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Activity className="w-4 h-4" />
                <span>状態を更新</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}