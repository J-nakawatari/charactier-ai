'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Eye, Star, Calendar, Tag } from 'lucide-react';
import Image from 'next/image';

interface LocalizedString {
  ja: string;
  en: string;
}

interface GalleryImage {
  url: string;
  unlockLevel: number;
  title: LocalizedString;
  description: LocalizedString;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  tags: string[];
  isDefault: boolean;
  order: number;
  createdAt: string;
}

interface AffinityImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterId: string;
  characterName: string;
  userAffinityLevel: number;
  locale: string;
}

export default function AffinityImageModal({
  isOpen,
  onClose,
  characterId,
  characterName,
  userAffinityLevel,
  locale
}: AffinityImageModalProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  const fetchAffinityImages = useCallback(async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('accessToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('🔍 Fetching affinity images for character:', characterId);
      const response = await fetch(`/api/characters/${characterId}/affinity-images`, {
        headers
      });

      console.log('🔍 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`Failed to fetch affinity images: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔍 Affinity images data:', data);
      setImages(data.images || []);
      
      // 最新のアンロック画像を自動選択
      const unlockedImages = data.images.filter((img: GalleryImage) => img.unlockLevel <= userAffinityLevel);
      if (unlockedImages.length > 0) {
        const latestImage = unlockedImages.sort((a: GalleryImage, b: GalleryImage) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        setSelectedImage(latestImage);
      }
    } catch (error) {
      console.error('Failed to fetch affinity images:', error);
    } finally {
      setLoading(false);
    }
  }, [characterId, userAffinityLevel]);

  useEffect(() => {
    if (isOpen && characterId) {
      console.log('🔍 AffinityImageModal: モーダル表示開始', {
        isOpen,
        characterId,
        characterName,
        userAffinityLevel
      });
      fetchAffinityImages();
    }
  }, [isOpen, characterId, characterName, userAffinityLevel, fetchAffinityImages]);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'epic': return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'rare': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'レジェンダリー';
      case 'epic': return 'エピック';
      case 'rare': return 'レア';
      default: return 'コモン';
    }
  };

  if (!isOpen) return null;

  const unlockedImages = images.filter(img => img.unlockLevel <= userAffinityLevel);
  const lockedImages = images.filter(img => img.unlockLevel > userAffinityLevel);

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Eye className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {characterName} の親密度画像
              </h2>
              <p className="text-sm text-gray-500">
                現在のレベル: {userAffinityLevel} | 
                解放済み: {unlockedImages.length}枚 | 
                未解放: {lockedImages.length}枚
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            <span className="ml-3 text-gray-600">画像を読み込み中...</span>
          </div>
        ) : (
          <div className="flex">
            {/* 画像リスト */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto max-h-[60vh]">
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">解放済み画像</h3>
                <div className="space-y-2">
                  {unlockedImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(image)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedImage === image
                          ? 'border-pink-300 bg-pink-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <Image
                            src={image.url}
                            alt={image.title[locale as keyof LocalizedString]}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {image.title[locale as keyof LocalizedString]}
                          </p>
                          <p className="text-xs text-gray-500">Lv.{image.unlockLevel}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {lockedImages.length > 0 && (
                  <>
                    <h3 className="font-medium text-gray-900 mb-3 mt-6">未解放画像</h3>
                    <div className="space-y-2">
                      {lockedImages.map((image, index) => (
                        <div
                          key={index}
                          className="w-full p-3 rounded-lg border border-gray-200 bg-gray-50 opacity-60"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0 flex items-center justify-center">
                              <Eye className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-500 truncate">
                                Lv.{image.unlockLevel}で解放
                              </p>
                              <p className="text-xs text-gray-400">
                                {getRarityLabel(image.rarity)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 選択された画像の詳細 */}
            <div className="flex-1 p-6">
              {selectedImage ? (
                <div className="space-y-4">
                  {/* 画像表示 */}
                  <div className="relative">
                    <div className="w-full h-80 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={selectedImage.url}
                        alt={selectedImage.title[locale as keyof LocalizedString]}
                        width={600}
                        height={320}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    {/* レア度バッジ */}
                    <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium border ${getRarityColor(selectedImage.rarity)}`}>
                      {getRarityLabel(selectedImage.rarity)}
                    </div>
                  </div>

                  {/* 画像情報 */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {selectedImage.title[locale as keyof LocalizedString]}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {selectedImage.description[locale as keyof LocalizedString]}
                      </p>
                    </div>

                    {/* メタ情報 */}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4" />
                        <span>レベル {selectedImage.unlockLevel}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(selectedImage.createdAt).toLocaleDateString('ja-JP')}</span>
                      </div>
                    </div>

                    {/* タグ */}
                    {selectedImage.tags.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-wrap gap-1">
                          {selectedImage.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-80 text-gray-500">
                  <div className="text-center">
                    <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>画像を選択してください</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* フッター */}
        {!loading && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>親密度を上げて新しい画像を解放しましょう！</span>
              <span>合計 {images.length} 枚の画像</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}