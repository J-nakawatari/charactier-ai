'use client';

import { Heart, Star } from 'lucide-react';
import { useMemo, useEffect, useState } from 'react';

interface AffinityBarProps {
  level: number;
  currentExp: number;
  nextLevelExp: number;
  themeColor: string;
  mood?: 'happy' | 'sad' | 'angry' | 'shy' | 'excited';
  characterId?: string;
  onAffinityUpdate?: (newAffinity: { level: number; experience: number }) => void;
}

export function AffinityBar({ 
  level, 
  currentExp, 
  nextLevelExp, 
  themeColor, 
  mood = 'happy',
  characterId,
  onAffinityUpdate
}: AffinityBarProps) {
  const [animatingIncrease, setAnimatingIncrease] = useState(false);
  const [lastLevel, setLastLevel] = useState(level);
  const [lastExp, setLastExp] = useState(currentExp);
  
  // レベルアップアニメーション管理
  useEffect(() => {
    if (level > lastLevel) {
      setAnimatingIncrease(true);
      const timer = setTimeout(() => {
        setAnimatingIncrease(false);
        setLastLevel(level);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (level !== lastLevel) {
      setLastLevel(level);
    }
  }, [level, lastLevel]);
  
  // 経験値増加アニメーション
  useEffect(() => {
    if (currentExp > lastExp) {
      setAnimatingIncrease(true);
      const timer = setTimeout(() => {
        setAnimatingIncrease(false);
        setLastExp(currentExp);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (currentExp !== lastExp) {
      setLastExp(currentExp);
    }
  }, [currentExp, lastExp]);
  const expPercentage = Math.min((currentExp / nextLevelExp) * 100, 100);
  const expNeeded = Math.max(nextLevelExp - currentExp, 0);
  
  // レベルアップ特效の判定
  const isLevelingUp = animatingIncrease && level > lastLevel;
  const isExpGaining = animatingIncrease && currentExp > lastExp;

  const moodConfig = useMemo(() => {
    switch (mood) {
      case 'happy':
        return {
          emoji: '😊',
          text: '楽しい',
          color: '#10B981',
          bgColor: '#D1FAE5',
          heartRate: [16, 16, 28, 70, 16, 16, 45, 16, 16, 35, 16, 16],
          speed: 2000
        };
      case 'excited':
        return {
          emoji: '🤗',
          text: 'ワクワク',
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          heartRate: [20, 20, 35, 75, 20, 20, 60, 20, 20, 50, 20, 20],
          speed: 1200
        };
      case 'shy':
        return {
          emoji: '😳',
          text: '恥ずかしい',
          color: '#EF4444',
          bgColor: '#FEE2E2',
          heartRate: [18, 18, 30, 65, 18, 18, 40, 18, 18, 35, 18, 18],
          speed: 1800
        };
      case 'sad':
        return {
          emoji: '😢',
          text: '悲しい',
          color: '#6B7280',
          bgColor: '#F3F4F6',
          heartRate: [14, 14, 20, 45, 14, 14, 25, 14, 14, 22, 14, 14],
          speed: 3000
        };
      case 'angry':
        return {
          emoji: '😤',
          text: '怒ってる',
          color: '#DC2626',
          bgColor: '#FEE2E2',
          heartRate: [25, 25, 40, 80, 25, 25, 70, 25, 25, 60, 25, 25],
          speed: 800
        };
      default:
        return {
          emoji: '😊',
          text: '普通',
          color: '#6B7280',
          bgColor: '#F3F4F6',
          heartRate: [16, 16, 28, 65, 16, 16, 40, 16, 16, 30, 16, 16],
          speed: 2000
        };
    }
  }, [mood]);

  return (
    <div className="flex items-center space-x-4">
      {/* レベル表示 */}
      <div className="flex items-center space-x-1">
        {/* モバイル: 丸い数字のみ */}
        <div 
          className={`sm:hidden w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm transition-all duration-500 ${
            isLevelingUp ? 'animate-bounce scale-110 shadow-lg' : ''
          }`}
          style={{ backgroundColor: themeColor }}
        >
          {level}
        </div>
        
        {/* デスクトップ: ハートアイコン + Lv.12 */}
        <div className="hidden sm:flex items-center space-x-1">
          <Heart className={`w-4 h-4 text-pink-500 transition-all duration-300 ${
            isLevelingUp ? 'animate-pulse scale-125' : ''
          }`} />
          <span className={`text-sm font-medium text-gray-700 transition-all duration-300 ${
            isLevelingUp ? 'text-yellow-600 font-bold' : ''
          }`}>Lv.{level}</span>
          {isLevelingUp && (
            <span className="text-xs text-yellow-600 animate-bounce">UP!</span>
          )}
        </div>
      </div>

      {/* 経験値バー */}
      <div className="flex-1 max-w-md">
        <div className="hidden sm:flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">親密度</span>
          <span className="text-xs text-gray-600">
            あと{expNeeded}EXP
          </span>
        </div>
        
        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out ${
              isExpGaining ? 'shadow-lg shadow-blue-300/50' : ''
            }`}
            style={{ 
              width: `${expPercentage}%`,
              backgroundColor: themeColor 
            }}
          >
            {/* キラキラエフェクト */}
            <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent ${
              isExpGaining ? 'animate-bounce' : 'animate-pulse'
            }`}></div>
          </div>
          
          {/* レベルアップ間近のエフェクト */}
          {expPercentage > 80 && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-400/20 animate-pulse"></div>
          )}
        </div>
        
        <div className="hidden sm:flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">{currentExp}</span>
          <span className="text-xs text-gray-500">{nextLevelExp}</span>
        </div>
      </div>

      {/* 感情状態表示（モバイル優先） */}
      <div className="flex items-center space-x-4">
        {/* 気分表示 */}
        <div className="flex items-center space-x-2">
          <span className="text-lg sm:text-xl">{moodConfig.emoji}</span>
          <span 
            className="hidden sm:inline-block text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full font-medium"
            style={{ 
              color: moodConfig.color,
              backgroundColor: moodConfig.bgColor
            }}
          >
            {moodConfig.text}
          </span>
        </div>

        {/* 心電図（デスクトップのみ） */}
        <div className="hidden sm:block relative w-48 h-8 overflow-hidden">
          <svg 
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 192 32"
            preserveAspectRatio="none"
          >
            <polyline
              points={moodConfig.heartRate.map((value, index) => 
                `${(index / (moodConfig.heartRate.length - 1)) * 192},${32 - (value / 80 * 26)}`
              ).join(' ')}
              fill="none"
              stroke={moodConfig.color}
              strokeWidth="2.5"
              className="animate-pulse"
              style={{
                animationDuration: `${moodConfig.speed}ms`
              }}
            />
            
            {/* 動く点（より大きく） */}
            <circle
              cx="96"
              cy="16"
              r="2.5"
              fill={moodConfig.color}
              className="animate-ping"
              style={{
                animationDuration: `${moodConfig.speed}ms`
              }}
            />
          </svg>
          
          {/* グラデーションオーバーレイ */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-30"
            style={{
              animation: `slideRight ${moodConfig.speed * 2}ms infinite linear`
            }}
          ></div>
        </div>
      </div>

      {/* 次のレベル特典ヒント */}
      {level % 10 === 9 && (
        <div className="flex items-center space-x-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
          <Star className="w-3 h-3" />
          <span>特典解放まであと少し！</span>
        </div>
      )}
    </div>
  );
}