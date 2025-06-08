'use client';

import { Heart, Star } from 'lucide-react';

interface AffinityBarProps {
  level: number;
  currentExp: number;
  nextLevelExp: number;
  themeColor: string;
}

export function AffinityBar({ level, currentExp, nextLevelExp, themeColor }: AffinityBarProps) {
  const expPercentage = (currentExp / nextLevelExp) * 100;
  const expNeeded = nextLevelExp - currentExp;

  return (
    <div className="flex items-center space-x-4">
      {/* レベル表示 */}
      <div className="flex items-center space-x-2">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
          style={{ backgroundColor: themeColor }}
        >
          {level}
        </div>
        <div className="flex items-center space-x-1">
          <Heart className="w-4 h-4 text-pink-500" />
          <span className="text-sm font-medium text-gray-700">Lv.{level}</span>
        </div>
      </div>

      {/* 経験値バー */}
      <div className="flex-1 max-w-md">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">親密度</span>
          <span className="text-xs text-gray-600">
            あと{expNeeded}EXP
          </span>
        </div>
        
        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
            style={{ 
              width: `${expPercentage}%`,
              backgroundColor: themeColor 
            }}
          >
            {/* キラキラエフェクト */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
          </div>
          
          {/* レベルアップ間近のエフェクト */}
          {expPercentage > 80 && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-400/20 animate-pulse"></div>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">{currentExp}</span>
          <span className="text-xs text-gray-500">{nextLevelExp}</span>
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