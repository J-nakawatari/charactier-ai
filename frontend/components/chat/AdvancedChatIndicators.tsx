'use client';

import { useState, useEffect } from 'react';
import { 
  Brain, 
  Zap, 
  Heart, 
  Activity, 
  Database, 
  Clock, 
  Smile,
  Frown,
  Angry,
  Meh,
  Eye,
  Info
} from 'lucide-react';

// 🎭 ムード・口調・キャッシュ状態の高度表示
interface AdvancedChatIndicatorsProps {
  characterId: string;
  affinityLevel: number;
  className?: string;
}

// キャラクター状態型定義
interface CharacterState {
  mood: 'happy' | 'sad' | 'angry' | 'neutral' | 'excited' | 'shy';
  tone: string;
  personalityShift: number; // 0-100 親密度による性格変化
  cacheStatus: {
    isHit: boolean;
    responseTime: number;
    cacheAge: number;
  };
  aiModelInfo: {
    model: string;
    version: string;
    contextLength: number;
  };
}

export default function AdvancedChatIndicators({ 
  characterId, 
  affinityLevel, 
  className = '' 
}: AdvancedChatIndicatorsProps) {
  const [characterState, setCharacterState] = useState<CharacterState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // 🎭 ムードアイコン取得
  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'happy':
        return <Smile className="w-4 h-4 text-yellow-500" />;
      case 'sad':
        return <Frown className="w-4 h-4 text-blue-500" />;
      case 'angry':
        return <Angry className="w-4 h-4 text-red-500" />;
      case 'excited':
        return <Zap className="w-4 h-4 text-orange-500" />;
      case 'shy':
        return <Heart className="w-4 h-4 text-pink-500" />;
      default:
        return <Meh className="w-4 h-4 text-gray-500" />;
    }
  };

  // 🎨 ムードラベル取得
  const getMoodLabel = (mood: string) => {
    const moodLabels = {
      happy: '嬉しい',
      sad: '悲しい',
      angry: '怒っている',
      excited: 'わくわく',
      shy: '恥ずかしがり',
      neutral: '普通'
    };
    return moodLabels[mood as keyof typeof moodLabels] || '不明';
  };

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

  // 🔄 キャラクター状態取得
  const fetchCharacterState = async () => {
    try {
      setLoading(true);
      
      // 実際のAPIがない場合のモックデータ
      const mockState: CharacterState = {
        mood: ['happy', 'sad', 'excited', 'shy', 'neutral'][Math.floor(Math.random() * 5)] as any,
        tone: affinityLevel < 10 ? '丁寧語' : 
              affinityLevel < 30 ? 'フレンドリー' : 
              affinityLevel < 60 ? '親しみやすい' : '親密',
        personalityShift: Math.min(affinityLevel * 1.2, 100),
        cacheStatus: {
          isHit: Math.random() > 0.3,
          responseTime: Math.floor(Math.random() * 800) + 50,
          cacheAge: Math.floor(Math.random() * 3600)
        },
        aiModelInfo: {
          model: 'gpt-4',
          version: '0613',
          contextLength: 8192
        }
      };

      // TODO: 実際のAPIを実装
      // const response = await fetch(`/api/characters/${characterId}/state`);
      // const data = await response.json();
      
      setTimeout(() => {
        setCharacterState(mockState);
        setLoading(false);
      }, 300);

    } catch (error) {
      console.error('キャラクター状態取得エラー:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharacterState();
  }, [characterId, affinityLevel]);

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
          title={`ムード: ${getMoodLabel(characterState.mood)}`}
        >
          {getMoodIcon(characterState.mood)}
          <span className="text-xs text-gray-600 hidden sm:inline">
            {getMoodLabel(characterState.mood)}
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
                {getMoodIcon(characterState.mood)}
                <span className="text-sm font-medium text-gray-700">現在のムード</span>
              </div>
              <div className="text-sm text-gray-600 ml-6">
                {getMoodLabel(characterState.mood)} - 親密度 {affinityLevel} に応じた感情状態
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

            {/* AIモデル情報 */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">AIモデル情報</span>
              </div>
              <div className="text-sm text-gray-600 ml-6">
                <div>モデル: <span className="font-medium">{characterState.aiModelInfo.model}</span></div>
                <div>バージョン: <span className="font-medium">{characterState.aiModelInfo.version}</span></div>
                <div>コンテキスト長: <span className="font-medium">{characterState.aiModelInfo.contextLength.toLocaleString()}</span></div>
              </div>
            </div>

            {/* 更新ボタン */}
            <div className="pt-2 border-t border-gray-200">
              <button
                onClick={fetchCharacterState}
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