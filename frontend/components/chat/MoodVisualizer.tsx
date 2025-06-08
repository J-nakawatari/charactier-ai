'use client';

import { useMemo } from 'react';

interface MoodVisualizerProps {
  mood: 'happy' | 'sad' | 'angry' | 'shy' | 'excited';
}

export function MoodVisualizer({ mood }: MoodVisualizerProps) {
  const moodConfig = useMemo(() => {
    switch (mood) {
      case 'happy':
        return {
          emoji: '😊',
          text: '楽しい',
          color: '#10B981',
          bgColor: '#D1FAE5',
          heartRate: [20, 35, 25, 40, 30, 35, 20, 30],
          speed: 2000
        };
      case 'excited':
        return {
          emoji: '🤗',
          text: 'ワクワク',
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          heartRate: [40, 60, 45, 65, 50, 70, 40, 55],
          speed: 1200
        };
      case 'shy':
        return {
          emoji: '😳',
          text: '恥ずかしい',
          color: '#EF4444',
          bgColor: '#FEE2E2',
          heartRate: [30, 45, 35, 50, 40, 45, 30, 40],
          speed: 1800
        };
      case 'sad':
        return {
          emoji: '😢',
          text: '悲しい',
          color: '#6B7280',
          bgColor: '#F3F4F6',
          heartRate: [15, 20, 18, 25, 20, 22, 15, 20],
          speed: 3000
        };
      case 'angry':
        return {
          emoji: '😤',
          text: '怒ってる',
          color: '#DC2626',
          bgColor: '#FEE2E2',
          heartRate: [50, 70, 55, 75, 60, 80, 45, 65],
          speed: 800
        };
      default:
        return {
          emoji: '😊',
          text: '普通',
          color: '#6B7280',
          bgColor: '#F3F4F6',
          heartRate: [20, 30, 25, 35, 30, 35, 20, 30],
          speed: 2000
        };
    }
  }, [mood]);

  return (
    <div className="flex items-center space-x-3">
      {/* 気分表示 */}
      <div className="flex items-center space-x-2">
        <span className="text-lg">{moodConfig.emoji}</span>
        <span 
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{ 
            color: moodConfig.color,
            backgroundColor: moodConfig.bgColor
          }}
        >
          {moodConfig.text}
        </span>
      </div>

      {/* 心拍グラフ風エフェクト */}
      <div className="relative w-16 h-6 overflow-hidden">
        <svg 
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 64 24"
          preserveAspectRatio="none"
        >
          <polyline
            points={moodConfig.heartRate.map((value, index) => 
              `${(index / (moodConfig.heartRate.length - 1)) * 64},${24 - (value / 80 * 20)}`
            ).join(' ')}
            fill="none"
            stroke={moodConfig.color}
            strokeWidth="2"
            className="animate-pulse"
            style={{
              animationDuration: `${moodConfig.speed}ms`
            }}
          />
          
          {/* 動く点 */}
          <circle
            cx="32"
            cy="12"
            r="1.5"
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
  );
}