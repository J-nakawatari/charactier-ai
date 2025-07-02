'use client';

import { 
  Smile,
  Frown,
  Angry,
  Zap,
  Heart,
  Meh
} from 'lucide-react';

// ムードアイコン取得（統一）
export const getMoodIcon = (mood: string) => {
  switch (mood) {
    case 'happy':
      return Smile;
    case 'sad':
      return Frown;
    case 'angry':
      return Angry;
    case 'excited':
      return Zap;
    case 'shy':
      return Heart;
    default:
      return Meh;
  }
};

// ムードアイコンの色取得（統一）
export const getMoodIconColor = (mood: string) => {
  switch (mood) {
    case 'happy':
      return 'text-yellow-500';
    case 'sad':
      return 'text-blue-500';
    case 'angry':
      return 'text-red-500';
    case 'excited':
      return 'text-orange-500';
    case 'shy':
      return 'text-pink-500';
    default:
      return 'text-gray-500';
  }
};

// ムードラベル取得（i18n対応）
export const getMoodLabel = (mood: string, t?: (key: string) => string) => {
  // i18n関数が提供されている場合は国際化対応
  if (t) {
    return t(mood) || t('unknown');
  }
  
  // フォールバック: デフォルトラベル（多言語対応以前の互換性のため）
  const moodLabels = {
    happy: 'happy',
    sad: 'sad', 
    angry: 'angry',
    excited: 'excited',
    melancholic: 'melancholic',
    shy: 'shy',
    neutral: 'neutral'
  };
  return moodLabels[mood as keyof typeof moodLabels] || 'unknown';
};

// 感情に基づく背景グラデーション取得
export const getMoodBackgroundGradient = (mood: string) => {
  const gradients = {
    excited: {
      background: 'linear-gradient(135deg, #fef3c7, #fed7aa, #fecaca)', // 暖かいオレンジ～ピンク
      overlay: 'bg-orange-500/5'
    },
    melancholic: {
      background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe, #a5b4fc)', // 冷たい青系
      overlay: 'bg-blue-500/5'
    },
    happy: {
      background: 'linear-gradient(135deg, #ecfdf5, #d1fae5, #a7f3d0)', // 明るい緑系
      overlay: 'bg-green-500/5'
    },
    sad: {
      background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb, #d1d5db)', // 落ち着いたグレー
      overlay: 'bg-gray-500/5'
    },
    angry: {
      background: 'linear-gradient(135deg, #fee2e2, #fecaca, #fca5a5)', // 情熱的な赤系
      overlay: 'bg-red-500/5'
    },
    neutral: {
      background: 'linear-gradient(to bottom right, #faf5ff, #f3e8ff, #ddd6fe)', // デフォルト紫系
      overlay: 'bg-purple-500/5'
    }
  };
  
  return gradients[mood as keyof typeof gradients] || gradients.neutral;
};

// 感情に基づくアクセントカラー取得
export const getMoodAccentColor = (mood: string) => {
  const colors = {
    excited: '#f59e0b',
    melancholic: '#3b82f6', 
    happy: '#10b981',
    sad: '#6b7280',
    angry: '#dc2626',
    neutral: '#8b5cf6'
  };
  
  return colors[mood as keyof typeof colors] || colors.neutral;
};