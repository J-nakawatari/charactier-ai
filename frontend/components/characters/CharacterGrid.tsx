'use client';

import React from 'react';
import CharacterCard from './CharacterCard';
import { User, Search } from 'lucide-react';
import type { BaseCharacter } from '@/types/common';

// CharacterGrid用の型定義（ユーザー向け表示用）
interface GridCharacter {
  _id: string;
  name: string;
  description: string;
  characterAccessType?: 'free' | 'purchaseOnly';
  personalityPreset?: string;
  personalityTags?: string[];
  gender?: string;
  themeColor?: string;
  imageCharacterSelect?: string;
  imageChatAvatar?: string;
  imageChatBackground?: string;
  currentMood?: string;
  affinityStats?: {
    totalUsers: number;
    averageLevel: number;
  };
}

interface UserAffinity {
  characterId: string;
  level: number;
}

interface CharacterGridProps {
  characters: GridCharacter[];
  userAffinities?: UserAffinity[];
  userTokenBalance?: number;
  userPurchasedCharacters?: string[];
  onCharacterClick?: (character: GridCharacter) => void;
  isLoading?: boolean;
  filterKey?: string; // アニメーション用のキー
}

export default function CharacterGrid({ 
  characters, 
  userAffinities = [],
  userTokenBalance = 0,
  userPurchasedCharacters = [],
  onCharacterClick,
  isLoading = false,
  filterKey = 'default'
}: CharacterGridProps) {
  
  // キャラクターのロック状態とアクセス権限を判定
  const getCharacterAccess = (character: GridCharacter) => {
    switch (character.characterAccessType) {
      case 'free':
        // ベースキャラ: 誰でも利用可能
        return { isLocked: false, hasAccess: true };
      
      case 'purchaseOnly':
        // プレミアムキャラ: 購入が必要
        const isPurchased = userPurchasedCharacters.includes(character._id);
        console.log(`Character ${character.name} (${character._id}): isPurchased=${isPurchased}, accessType=${character.characterAccessType}`);
        return { 
          isLocked: !isPurchased, 
          hasAccess: isPurchased 
        };
      
      default:
        return { isLocked: true, hasAccess: false };
    }
  };

  // ユーザーの親密度を取得
  const getUserAffinity = (characterId: string): number => {
    const affinity = userAffinities.find(a => a.characterId === characterId);
    return affinity ? affinity.level : 0;
  };

  // ローディング状態の表示
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* 画像エリアのスケルトン */}
            <div className="aspect-square bg-gray-200 animate-pulse" />
            
            {/* コンテンツエリアのスケルトン */}
            <div className="p-4 space-y-3">
              {/* タイトル */}
              <div className="h-5 bg-gray-200 rounded animate-pulse" />
              
              {/* 説明文 */}
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
              </div>
              
              {/* タグ */}
              <div className="flex space-x-2">
                <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
              
              {/* ボタン */}
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // キャラクターがない場合の表示
  if (!characters || characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Search className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          キャラクターが見つかりません
        </h3>
        <p className="text-gray-600 text-center max-w-md">
          検索条件を変更するか、フィルターをリセットしてみてください。
        </p>
      </div>
    );
  }

  return (
    <div 
      key={filterKey}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {characters.map((character, index) => {
        const { isLocked } = getCharacterAccess(character);
        const currentAffinity = getUserAffinity(character._id);
        
        // purchasePrice フィールドから価格を取得
        const price = character.purchasePrice || undefined;
        
        return (
          <div
            key={character._id}
            className="opacity-0 translate-y-4 transition-all duration-500 ease-out"
            style={{ 
              animationDelay: `${index * 100}ms`,
              animation: `fadeInUp 0.5s ease-out ${index * 100}ms forwards`
            }}
          >
            <CharacterCard
              character={{
                ...character,
                name: typeof character.name === 'string' 
                  ? { ja: character.name, en: character.name }
                  : character.name,
                description: typeof character.description === 'string'
                  ? { ja: character.description, en: character.description }
                  : character.description,
                personalityPreset: character.personalityPreset || '',
                personalityTags: character.personalityTags || [],
                gender: 'unknown',
                characterAccessType: character.characterAccessType || 'free',
                aiModel: 'gpt-4o-mini',
                isActive: true,
                createdAt: new Date().toISOString()
              }}
              currentAffinity={currentAffinity}
              isLocked={isLocked}
              price={price}
              onClick={onCharacterClick ? (char) => onCharacterClick(character) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}