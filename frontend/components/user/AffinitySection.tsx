'use client';

import React, { useState } from 'react';
import { Heart, Star, Lock, Unlock } from 'lucide-react';
import Image from 'next/image';
import AffinityDetailModal from './AffinityDetailModal';
import AffinityImageModal from './AffinityImageModal';

interface LocalizedString {
  ja: string;
  en: string;
}

interface AffinityItem {
  character: {
    _id: string;
    name: LocalizedString;
    imageCharacterSelect: string;
    themeColor: string;
  };
  level: number;
  experience: number;
  experienceToNext: number;
  maxExperience: number;
  unlockedImages: string[];
  nextUnlockLevel: number;
}

interface AffinitySectionProps {
  affinities: AffinityItem[];
  locale: string;
}

export default function AffinitySection({ affinities, locale }: AffinitySectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<AffinityItem | null>(null);
  
  const getProgressPercentage = (experience: number, maxExperience: number) => {
    return maxExperience > 0 ? (experience / maxExperience) * 100 : 0;
  };

  const isUnlockAvailable = (level: number, nextUnlockLevel: number, unlockedImages: string[]) => {
    // unlockedImages が undefined の場合は空配列として扱う
    const images = unlockedImages || [];
    
    // レベル0で画像が0枚の場合は通知を表示しない
    if (level === 0 && images.length === 0) {
      return false;
    }
    return level >= nextUnlockLevel && nextUnlockLevel > 0;
  };

  const handleViewImages = (affinity: AffinityItem) => {
    console.log('🔍 handleViewImages called with:', {
      characterId: affinity.character._id,
      characterName: affinity.character.name,
      level: affinity.level,
      unlockedImages: affinity.unlockedImages
    });
    setSelectedCharacter(affinity);
    setImageModalOpen(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-2 mb-6">
        <div className="p-2 bg-pink-100 rounded-lg">
          <Heart className="w-5 h-5 text-pink-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">親密度</h3>
      </div>

      {/* 親密度リスト */}
      <div className="space-y-4">
        {(affinities || []).map((affinity) => (
          <div
            key={affinity.character._id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-4">
              {/* キャラクターアバター */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                  <Image
                    src={affinity.character.imageCharacterSelect}
                    alt={affinity.character.name[locale as keyof LocalizedString]}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* レベル表示 */}
                <div 
                  className="absolute -bottom-1 -right-1 text-xs font-bold px-2 py-1 rounded-full text-white"
                  style={{ backgroundColor: affinity.character.themeColor }}
                >
                  Lv.{affinity.level}
                </div>
              </div>

              {/* 親密度情報 */}
              <div className="flex-1 min-w-0">
                {/* キャラクター名 */}
                <h4 className="font-medium text-gray-900 mb-1">
                  {affinity.character.name[locale as keyof LocalizedString]}
                </h4>

                {/* 経験値バー */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>EXP: {affinity.experience} / {affinity.maxExperience}</span>
                    <span>あと{affinity.experienceToNext}EXP</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        backgroundColor: affinity.character.themeColor,
                        width: `${getProgressPercentage(affinity.experience, affinity.maxExperience)}%`
                      }}
                    />
                  </div>
                </div>

                {/* アンロック情報 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-gray-600">
                        解放済み: {affinity.unlockedImages.length}枚
                      </span>
                    </div>
                  </div>
                  
                  {/* 次のアンロック */}
                  <div className="flex items-center space-x-1 text-sm">
                    {isUnlockAvailable(affinity.level, affinity.nextUnlockLevel) ? (
                      <>
                        <Unlock className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 font-medium">
                          新しい画像が利用可能！
                        </span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">
                          Lv.{affinity.nextUnlockLevel}で解放
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* アンロック通知 */}
            {isUnlockAvailable(affinity.level, affinity.nextUnlockLevel, affinity.unlockedImages) && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Unlock className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    新しい画像がアンロックされました！
                  </span>
                </div>
                <button 
                  onClick={() => handleViewImages(affinity)}
                  className="mt-2 text-sm text-green-700 hover:text-green-800 underline transition-colors"
                >
                  画像を確認する
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* フッター */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            キャラクターとの会話で親密度がアップします
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            親密度について詳しく見る
          </button>
        </div>
      </div>

      {/* 親密度詳細モーダル */}
      <AffinityDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        affinities={affinities || []}
        locale={locale}
      />

      {/* 親密度画像モーダル */}
      {selectedCharacter && (
        <AffinityImageModal
          isOpen={imageModalOpen}
          onClose={() => {
            setImageModalOpen(false);
            setSelectedCharacter(null);
          }}
          characterId={selectedCharacter.character._id}
          characterName={selectedCharacter.character.name[locale as keyof LocalizedString]}
          userAffinityLevel={selectedCharacter.level}
          locale={locale}
        />
      )}
    </div>
  );
}