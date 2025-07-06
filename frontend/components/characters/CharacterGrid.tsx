'use client';

import React from 'react';
import CharacterCard from './CharacterCard';
import { User, Search } from 'lucide-react';
import type { BaseCharacter, LocalizedString } from '@/types/common';

// CharacterGrid用の型定義（BaseCharacterを拡張）
interface GridCharacter extends Omit<BaseCharacter, 'isActive' | 'createdAt' | 'updatedAt'> {
  affinityStats?: {
    totalUsers: number;
    averageLevel: number;
  };
  currentMood?: string;
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
  filterKey?: string; // アニメーション用のキー
}

export default function CharacterGrid({ 
  characters, 
  userAffinities = [],
  userTokenBalance = 0,
  userPurchasedCharacters = [],
  onCharacterClick,
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
        const isPurchased = userPurchasedCharacters.some(id => 
          id.toString() === character._id.toString()
        );
        console.log('🔍 購入判定:', {
          characterId: character._id,
          characterName: character.name,
          userPurchasedCharacters,
          isPurchased
        });
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

  // ローディング状態の表示を削除（チラツキ防止）

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
        const price = (character as any).purchasePrice || undefined;
        
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
              character={character as BaseCharacter}
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