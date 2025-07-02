import { create } from 'zustand';

// 気分状態の型定義
export type MoodState = 'excited' | 'melancholic' | 'happy' | 'sad' | 'angry' | 'neutral' | 'shy';

// 親密度ストアの状態
interface AffinityState {
  // 現在の気分状態
  mood: MoodState;
  
  // 親密度レベル
  level: number;
  
  // 経験値
  experience: number;
  
  // 最終更新時刻
  lastUpdated: Date | null;
  
  // アクション
  setMood: (mood: MoodState) => void;
  setLevel: (level: number) => void;
  setExperience: (experience: number) => void;
  updateAffinity: (data: { level?: number; experience?: number; mood?: MoodState }) => void;
  reset: () => void;
}

// Zustand store
export const useAffinityStore = create<AffinityState>((set) => ({
  // 初期状態
  mood: 'neutral',
  level: 0,
  experience: 0,
  lastUpdated: null,
  
  // 気分を更新
  setMood: (mood) => set((state) => ({
    ...state,
    mood,
    lastUpdated: new Date()
  })),
  
  // レベルを更新
  setLevel: (level) => set((state) => ({
    ...state,
    level,
    lastUpdated: new Date()
  })),
  
  // 経験値を更新
  setExperience: (experience) => set((state) => ({
    ...state,
    experience,
    lastUpdated: new Date()
  })),
  
  // 複数の値を一括更新
  updateAffinity: (data) => set((state) => ({
    ...state,
    ...data,
    lastUpdated: new Date()
  })),
  
  // ストアをリセット
  reset: () => set({
    mood: 'neutral',
    level: 0,
    experience: 0,
    lastUpdated: null
  })
}));

// 気分状態に基づくスタイル設定
export const getMoodStyles = (mood: MoodState) => {
  const moodStyles = {
    excited: {
      bgColor: 'bg-pink-100',
      textColor: 'text-pink-800',
      borderColor: 'border-pink-300',
      icon: '🎉',
      label: 'わくわく'
    },
    melancholic: {
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-300',
      icon: '😔',
      label: '憂鬱'
    },
    happy: {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300',
      icon: '😊',
      label: '嬉しい'
    },
    sad: {
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-300',
      icon: '😢',
      label: '悲しい'
    },
    angry: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
      icon: '😤',
      label: '怒り'
    },
    neutral: {
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-300',
      icon: '😐',
      label: '普通'
    },
    shy: {
      bgColor: 'bg-pink-100',
      textColor: 'text-pink-800',
      borderColor: 'border-pink-300',
      icon: '😊',
      label: '恥ずかしい'
    }
  };
  
  return moodStyles[mood] || moodStyles.neutral;
};