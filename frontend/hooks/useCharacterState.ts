'use client';

import { useState, useEffect, useCallback } from 'react';

// キャラクター状態型定義
export interface CharacterState {
  mood: 'happy' | 'sad' | 'angry' | 'neutral' | 'excited' | 'shy';
  tone: string;
  personalityShift: number; // 0-100 親密度による性格変化
  cacheStatus: {
    isHit: boolean;
    responseTime: number;
    cacheAge: number;
  };
}

// 共通のキャラクター状態管理フック
export function useCharacterState(characterId: string, affinityLevel: number) {
  const [characterState, setCharacterState] = useState<CharacterState | null>(null);
  const [loading, setLoading] = useState(true);

  // キャラクター状態取得
  const fetchCharacterState = useCallback(async () => {
    try {
      setLoading(true);
      
      // 実際のAPIがない場合のモックデータ（一元化）
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
      };

      // TODO: 実際のAPIを実装
      // const response = await fetch(`/api/v1/characters/${characterId}/state`);
      // const data = await response.json();
      
      setTimeout(() => {
        setCharacterState(mockState);
        setLoading(false);
      }, 300);

    } catch (error) {
      console.error('キャラクター状態取得エラー:', error);
      setLoading(false);
    }
  }, [characterId, affinityLevel]);

  useEffect(() => {
    fetchCharacterState();
  }, [fetchCharacterState]);

  return {
    characterState,
    loading,
    refetch: fetchCharacterState
  };
}