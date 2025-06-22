'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAffinityStore, getMoodStyles, MoodState } from '@/store/affinityStore';

interface MoodBadgeProps {
  mood?: MoodState;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

/**
 * キャラクターの現在の気分を表示するバッジコンポーネント
 */
export function MoodBadge({ 
  mood: propMood, 
  size = 'md',
  showIcon = true,
  showLabel = true,
  className = ''
}: MoodBadgeProps) {
  const { mood: storeMood, setMood } = useAffinityStore();
  const t = useTranslations('moods');
  
  // propsで渡された気分があればストアを更新
  useEffect(() => {
    if (propMood && propMood !== storeMood) {
      setMood(propMood);
    }
  }, [propMood, storeMood, setMood]);
  
  // 表示する気分状態（propsが優先、なければstore）
  const currentMood = propMood || storeMood;
  const moodStyles = getMoodStyles(currentMood);
  
  // サイズ設定
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };
  
  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  return (
    <div className={`
      inline-flex items-center space-x-1 rounded-full border
      ${moodStyles.bgColor} ${moodStyles.textColor} ${moodStyles.borderColor}
      ${sizeClasses[size]}
      transition-all duration-200 hover:scale-105
      ${className}
    `}>
      {showIcon && (
        <span className={iconSizes[size]} role="img" aria-label={moodStyles.label}>
          {moodStyles.icon}
        </span>
      )}
      
      {showLabel && (
        <span className="font-medium select-none">
          {t(currentMood)}
        </span>
      )}
    </div>
  );
}

/**
 * 気分変化を示すアニメーション付きバッジ
 */
export function AnimatedMoodBadge({ mood, ...props }: MoodBadgeProps) {
  const { mood: storeMood } = useAffinityStore();
  const [isChanging, setIsChanging] = useState(false);
  
  useEffect(() => {
    if (mood && mood !== storeMood) {
      setIsChanging(true);
      const timer = setTimeout(() => setIsChanging(false), 500);
      return () => clearTimeout(timer);
    }
  }, [mood, storeMood]);
  
  return (
    <div className={`
      transition-all duration-500
      ${isChanging ? 'scale-110 animate-pulse' : 'scale-100'}
    `}>
      <MoodBadge mood={mood} {...props} />
    </div>
  );
}

