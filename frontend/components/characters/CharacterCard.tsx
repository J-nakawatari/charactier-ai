'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MessageSquare, User, Sparkles } from 'lucide-react';
import AffinityBar from './AffinityBar';
import LockBadge from './LockBadge';

interface Character {
  _id: string;
  name: string;
  description: string;
  personalityPreset: string;
  personalityTags: string[];
  gender: string;
  characterAccessType: 'free' | 'token-based' | 'purchaseOnly';
  imageCharacterSelect?: string;
  imageChatAvatar?: string;
  affinityStats?: {
    totalUsers: number;
    averageLevel: number;
  };
}

interface CharacterCardProps {
  character: Character;
  currentAffinity?: number;
  isLocked: boolean;
  price?: number;
  onClick?: (character: Character) => void;
}

export default function CharacterCard({ 
  character, 
  currentAffinity = 0,
  isLocked,
  price,
  onClick 
}: CharacterCardProps) {
  const params = useParams();
  const locale = params.locale as string || 'ja';

  const handleClick = () => {
    if (onClick) {
      onClick(character);
    }
  };

  const getGenderIcon = (gender: string) => {
    switch (gender) {
      case 'male':
        return '♂';
      case 'female':
        return '♀';
      default:
        return '○';
    }
  };

  const getPersonalityColor = (preset: string) => {
    const colorMap: { [key: string]: string } = {
      'おっとり系': 'bg-green-100 text-green-700',
      '元気系': 'bg-orange-100 text-orange-700',
      'クール系': 'bg-blue-100 text-blue-700',
      '真面目系': 'bg-purple-100 text-purple-700',
      'セクシー系': 'bg-pink-100 text-pink-700',
      '天然系': 'bg-yellow-100 text-yellow-700',
      'ボーイッシュ系': 'bg-indigo-100 text-indigo-700',
      'お姉さん系': 'bg-red-100 text-red-700'
    };
    return colorMap[preset] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* キャラクター画像エリア */}
      <div className="relative aspect-square bg-gradient-to-br from-purple-100 to-pink-100">
        {character.imageCharacterSelect || character.imageChatAvatar ? (
          <img
            src={character.imageCharacterSelect || character.imageChatAvatar}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
              <User className="w-10 h-10 text-gray-400" />
            </div>
          </div>
        )}
        
        {/* バッジエリア */}
        <div className="absolute top-2 left-2">
          <LockBadge 
            accessType={character.characterAccessType}
            isLocked={isLocked}
            price={price}
            size="sm"
          />
        </div>

        {/* 性別表示 */}
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
            {getGenderIcon(character.gender)}
          </div>
        </div>

        {/* 人気度表示 */}
        {character.affinityStats && character.affinityStats.totalUsers > 0 && (
          <div className="absolute bottom-2 right-2">
            <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-full px-2 py-1">
              <Sparkles className="w-3 h-3 text-yellow-500" />
              <span className="text-xs font-medium text-gray-700">
                {character.affinityStats.totalUsers}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* コンテンツエリア */}
      <div className="p-4 space-y-3">
        {/* キャラクター名 */}
        <div>
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">
            {character.name}
          </h3>
          
          {/* 性格プリセット */}
          <div className="mt-1">
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getPersonalityColor(character.personalityPreset)}`}>
              {character.personalityPreset}
            </span>
          </div>
        </div>

        {/* 説明文 */}
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {character.description}
        </p>

        {/* 性格タグ */}
        {character.personalityTags && character.personalityTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {character.personalityTags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
            {character.personalityTags.length > 3 && (
              <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                +{character.personalityTags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 親密度バー */}
        {currentAffinity > 0 && (
          <div>
            <AffinityBar 
              level={currentAffinity} 
              size="sm"
              showLabel={true}
            />
          </div>
        )}

        {/* アクションボタン */}
        <div className="pt-2">
          {isLocked ? (
            <button
              onClick={handleClick}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <span>
                {character.characterAccessType === 'purchaseOnly' ? 'アンロック' : 'トークンが必要'}
              </span>
            </button>
          ) : (
            <Link 
              href={`/${locale}/characters/${character._id}/chat`}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <MessageSquare className="w-4 h-4" />
              <span>チャット開始</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}