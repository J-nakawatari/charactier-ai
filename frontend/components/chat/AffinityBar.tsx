'use client';

import { Heart, Star } from 'lucide-react';
import { useMemo, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getMoodIcon, getMoodIconColor, getMoodLabel, getMoodAccentColor } from '@/utils/moodUtils';

interface AffinityBarProps {
  level: number;
  currentExp: number;
  nextLevelExp: number;
  themeColor: string;
  mood?: 'excited' | 'melancholic' | 'happy' | 'sad' | 'angry' | 'neutral';
  characterId?: string;
  onAffinityUpdate?: (newAffinity: { level: number; experience: number }) => void;
}

export function AffinityBar({ 
  level, 
  currentExp, 
  nextLevelExp, 
  themeColor, 
  mood = 'neutral',
  characterId,
  onAffinityUpdate
}: AffinityBarProps) {
  const t = useTranslations('affinity');
  const moodT = useTranslations('moods');
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
  
  // 親密度ランクの取得
  const getAffinityRank = () => {
    if (level >= 80) return 'master';
    if (level >= 60) return 'expert';
    if (level >= 40) return 'closeFriend';
    if (level >= 20) return 'friend';
    return 'acquaintance';
  };
  
  // レベルアップ特效の判定
  const isLevelingUp = animatingIncrease && level > lastLevel;
  const isExpGaining = animatingIncrease && currentExp > lastExp;

  const moodConfig = useMemo(() => {
    const moodLabel = getMoodLabel(mood, (key: string) => moodT(key));
    const accentColor = getMoodAccentColor(mood);
    
    switch (mood) {
      case 'happy':
        return {
          text: moodLabel,
          color: accentColor,
          bgColor: '#D1FAE5',
          heartRate: [20, 25, 35, 65, 25, 30, 50, 25, 28, 45, 22, 35], // 穏やかで安定
          speed: 1800
        };
      case 'excited':
        return {
          text: moodLabel,
          color: accentColor,
          bgColor: '#FEF3C7',
          heartRate: [25, 45, 20, 75, 30, 80, 35, 70, 25, 65, 30, 75], // 激しいスパイク
          speed: 1000
        };
      case 'melancholic':
        return {
          text: moodLabel,
          color: accentColor,
          bgColor: '#DBEAFE',
          heartRate: [10, 12, 8, 18, 12, 15, 10, 16, 11, 14, 9, 13], // 平坦で低い
          speed: 3000
        };
      case 'sad':
        return {
          text: moodLabel,
          color: accentColor,
          bgColor: '#F3F4F6',
          heartRate: [15, 18, 12, 22, 16, 20, 14, 24, 17, 21, 13, 19], // 低く緩やか
          speed: 2800
        };
      case 'angry':
        return {
          text: moodLabel,
          color: accentColor,
          bgColor: '#FEE2E2',
          heartRate: [35, 80, 40, 85, 45, 90, 38, 88, 35, 85, 42, 87], // 高く不規則
          speed: 700
        };
      default:
        return {
          text: moodLabel,
          color: accentColor,
          bgColor: '#F3F4F6',
          heartRate: [20, 28, 18, 38, 22, 35, 20, 40, 24, 32, 19, 36], // 標準的
          speed: 2000
        };
    }
  }, [mood, moodT]);

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
          {Math.floor(level)}
        </div>
        
        {/* デスクトップ: ハートアイコン + Lv.12 */}
        <div className="hidden sm:flex items-center space-x-1">
          <Heart className={`w-4 h-4 text-pink-500 transition-all duration-300 ${
            isLevelingUp ? 'animate-pulse scale-125' : ''
          }`} />
          <span className={`text-sm font-medium text-gray-700 transition-all duration-300 ${
            isLevelingUp ? 'text-yellow-600 font-bold' : ''
          }`}>{t('levelUp', { level: Math.floor(level) })}</span>
          {isLevelingUp && (
            <span className="text-xs text-yellow-600 animate-bounce">{t('levelUpNotification')}</span>
          )}
        </div>
      </div>

      {/* 経験値バー */}
      <div className="flex-1 max-w-md">
        <div className="hidden sm:flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">{t('intimacyWithRank', { rank: t(`ranks.${getAffinityRank()}`) })}</span>
          <span className="text-xs text-gray-600">
            {t('expNeeded', { needed: expNeeded })}
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
          {(() => {
            const IconComponent = getMoodIcon(mood);
            const colorClass = getMoodIconColor(mood);
            return <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${colorClass}`} />;
          })()}
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
          <span>{t('specialRewardSoon')}</span>
        </div>
      )}
    </div>
  );
}