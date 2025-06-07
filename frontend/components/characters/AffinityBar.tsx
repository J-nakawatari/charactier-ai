'use client';

import React from 'react';
import { Heart } from 'lucide-react';

interface AffinityBarProps {
  level: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function AffinityBar({ 
  level, 
  showLabel = true, 
  size = 'md' 
}: AffinityBarProps) {
  // レベルを0-100の範囲にクランプ
  const clampedLevel = Math.max(0, Math.min(100, level));
  
  // 親密度レベルに応じた色の決定
  const getColorClasses = (level: number) => {
    if (level >= 80) {
      return {
        bg: 'bg-pink-500',
        text: 'text-pink-600',
        bgLight: 'bg-pink-100'
      };
    } else if (level >= 50) {
      return {
        bg: 'bg-yellow-500',
        text: 'text-yellow-600',
        bgLight: 'bg-yellow-100'
      };
    } else if (level >= 20) {
      return {
        bg: 'bg-blue-500',
        text: 'text-blue-600',
        bgLight: 'bg-blue-100'
      };
    } else {
      return {
        bg: 'bg-gray-400',
        text: 'text-gray-600',
        bgLight: 'bg-gray-100'
      };
    }
  };

  // サイズに応じたクラス
  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          container: 'space-y-1',
          bar: 'h-1.5',
          text: 'text-xs',
          icon: 'w-3 h-3'
        };
      case 'lg':
        return {
          container: 'space-y-2',
          bar: 'h-3',
          text: 'text-sm',
          icon: 'w-5 h-5'
        };
      default: // md
        return {
          container: 'space-y-1.5',
          bar: 'h-2',
          text: 'text-xs',
          icon: 'w-4 h-4'
        };
    }
  };

  const colors = getColorClasses(clampedLevel);
  const sizes = getSizeClasses(size);

  return (
    <div className={sizes.container}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-1 ${colors.text}`}>
            <Heart className={`${sizes.icon} fill-current`} />
            <span className={`font-medium ${sizes.text}`}>親密度</span>
          </div>
          <span className={`font-semibold ${sizes.text} ${colors.text}`}>
            {clampedLevel}%
          </span>
        </div>
      )}
      
      <div className={`w-full ${colors.bgLight} rounded-full overflow-hidden ${sizes.bar}`}>
        <div 
          className={`${sizes.bar} ${colors.bg} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedLevel}%` }}
        />
      </div>
    </div>
  );
}