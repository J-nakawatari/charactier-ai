'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import UserSidebar from '@/components/user/UserSidebar';
import Image from 'next/image';
import { authenticatedFetch } from '@/utils/auth';
import { API_BASE_URL } from '@/lib/api-config';
import { 
  Images, 
  ChevronDown, 
  User, 
  Heart, 
  Lock, 
  Unlock,
  Search,
  Filter,
  Grid,
  List,
  Star,
  X,
  ZoomIn
} from 'lucide-react';

interface Character {
  _id: string;
  name: { ja: string; en: string };
  description?: { ja: string; en: string };
  galleryImages: Array<{
    url: string;
    unlockLevel: number;
    title: { ja: string; en: string };
    description: { ja: string; en: string };
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    tags: string[];
    isDefault: boolean;
    order: number;
    createdAt: string;
  }>;
  personalityPreset: string;
  gender: string;
  isActive: boolean;
}

interface UserCharacterAffinity {
  characterId: string;
  affinityLevel: number;
  // ユーザーの親密度データ
}

export default function CharacterLibraryPage() {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('library');
  
  const [characters, setCharacters] = useState<Character[]>([]);
  const [userAffinities, setUserAffinities] = useState<Record<string, number>>({});
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterLevel, setFilterLevel] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const loadCharacterLibraryData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        console.error('No access token found');
        return;
      }

      // キャラクター一覧を取得
      const charactersResponse = await fetch('/api/characters', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (charactersResponse.ok) {
        const charactersData = await charactersResponse.json();
        const charactersWithGallery = charactersData.characters.filter((char: Character) => 
          char.galleryImages && char.galleryImages.length > 0
        );
        setCharacters(charactersWithGallery);
        
        // 🔍 デバッグ: 実際のユーザー親密度データを取得
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📚 Library API - ユーザー親密度データ取得');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        try {
          // 実際のユーザー親密度データを取得
          const affinityResponse = await fetch('/api/user/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (affinityResponse.ok) {
            const userData = await affinityResponse.json();
            console.log('👤 Library - ユーザープロファイルレスポンス:', userData);
            
            // ユーザーの親密度データを抽出
            const realAffinities: Record<string, number> = {};
            // userData.affinities または userData.user.affinities の両方をチェック
            const affinitiesData = userData.affinities || userData.user?.affinities;
            if (affinitiesData && Array.isArray(affinitiesData)) {
              affinitiesData.forEach((affinity: any) => {
                realAffinities[affinity.character] = affinity.level || 0;
                console.log('❤️ Library - キャラクター親密度:', {
                  characterId: affinity.character,
                  level: affinity.level,
                  experience: affinity.experience
                });
              });
            }
            
            console.log('📊 Library - 全体親密度マップ:', realAffinities);
            setUserAffinities(realAffinities);
            
          } else {
            console.error('❌ Library - 親密度データ取得失敗');
            // フォールバック: デフォルト値
            const fallbackAffinities: Record<string, number> = {};
            charactersWithGallery.forEach((char: Character) => {
              fallbackAffinities[char._id] = 0;
            });
            setUserAffinities(fallbackAffinities);
          }
        } catch (error) {
          console.error('❌ Library - 親密度取得エラー:', error);
          // フォールバック: デフォルト値
          const fallbackAffinities: Record<string, number> = {};
          charactersWithGallery.forEach((char: Character) => {
            fallbackAffinities[char._id] = 0;
          });
          setUserAffinities(fallbackAffinities);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (charactersWithGallery.length > 0 && !selectedCharacter) {
          setSelectedCharacter(charactersWithGallery[0]);
        }
      }
    } catch (err) {
      console.error('Error loading character library data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCharacter]);

  useEffect(() => {
    loadCharacterLibraryData();
  }, [loadCharacterLibraryData]);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showModal) {
        closeModal();
      }
    };

    if (showModal) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // スクロールを無効化
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset'; // スクロールを復元
    };
  }, [showModal]);

  const handleCharacterSelect = (character: Character) => {
    setSelectedCharacter(character);
    setDropdownOpen(false);
  };

  const handleImageClick = (image: any) => {
    setSelectedImage(image);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedImage(null);
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'bg-gray-100 text-gray-700 border-gray-200',
      rare: 'bg-blue-100 text-blue-700 border-blue-200',
      epic: 'bg-purple-100 text-purple-700 border-purple-200',
      legendary: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    };
    return colors[rarity as keyof typeof colors] || colors.common;
  };

  const getUnlockLevelStyle = (unlockLevel: number) => {
    if (unlockLevel >= 100) {
      return {
        badge: 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 text-white border-yellow-300 shadow-lg animate-pulse',
        container: 'relative overflow-hidden',
        glow: 'absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 blur-sm animate-pulse',
        border: 'border-2 border-yellow-400 shadow-yellow-400/50 shadow-lg'
      };
    } else if (unlockLevel >= 90) {
      return {
        badge: 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white border-purple-300 shadow-md',
        container: 'relative overflow-hidden',
        glow: 'absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-sm',
        border: 'border-2 border-purple-400 shadow-purple-400/30 shadow-md'
      };
    }
    return {
      badge: 'bg-green-100 text-green-700 border-green-200',
      container: '',
      glow: '',
      border: ''
    };
  };

  const getRarityText = (rarity: string) => {
    const rarityKey = `rarity.${rarity}` as const;
    return t(rarityKey) || rarity;
  };

  const isImageUnlocked = (unlockLevel: number, characterId: string) => {
    const userLevel = userAffinities[characterId] || 0;
    return userLevel >= unlockLevel;
  };

  const getUnlockedImages = () => {
    if (!selectedCharacter) return [];
    
    const userLevel = userAffinities[selectedCharacter._id] || 0;
    return selectedCharacter.galleryImages
      .filter(image => 
        userLevel >= image.unlockLevel &&
        (searchTerm === '' || 
          image.title[locale as keyof typeof image.title]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          image.description[locale as keyof typeof image.description]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          image.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) &&
        (filterLevel === null || image.unlockLevel <= filterLevel)
      )
      .sort((a, b) => a.unlockLevel - b.unlockLevel); // unlockLevelの昇順でソート
  };

  const getLockedImages = () => {
    if (!selectedCharacter) return [];
    
    const userLevel = userAffinities[selectedCharacter._id] || 0;
    return selectedCharacter.galleryImages
      .filter(image => userLevel < image.unlockLevel)
      .sort((a, b) => a.unlockLevel - b.unlockLevel); // unlockLevelの昇順でソート
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const unlockedImages = getUnlockedImages();
  const lockedImages = getLockedImages();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* サイドバー */}
      <UserSidebar locale={locale} />
      
      {/* メインコンテンツ */}
      <div className="flex-1 lg:ml-64 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Images className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                {t('title')}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {t('subtitle')}
              </p>
            </div>
          </div>
          
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* キャラクター選択とフィルター */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              
              {/* キャラクター選択 */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('character.selectLabel')}
                </label>
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-64 px-4 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {selectedCharacter?.name[locale as keyof typeof selectedCharacter.name]?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <span className="text-gray-900">
                          {selectedCharacter?.name[locale as keyof typeof selectedCharacter.name] || t('character.selectPlaceholder')}
                        </span>
                        {selectedCharacter && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Heart className="w-3 h-3 text-pink-500" />
                            <span className="text-xs text-gray-500">
                              {t('character.level', { level: userAffinities[selectedCharacter._id] || 0 })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  {dropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {characters.map((character) => (
                        <button
                          key={character._id}
                          onClick={() => handleCharacterSelect(character)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 flex items-center space-x-3"
                        >
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {character.name[locale as keyof typeof character.name]?.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-900 font-medium">{character.name[locale as keyof typeof character.name]}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>{t('character.unlockedCount', { count: character.galleryImages.filter(img => 
                                isImageUnlocked(img.unlockLevel, character._id)
                              ).length })}</span>
                              <span>{t('character.level', { level: userAffinities[character._id] || 0 })}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* フィルターとサーチ */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder={t('search.placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none text-gray-900 placeholder-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ギャラリー表示 */}
          {selectedCharacter ? (
            <div className="space-y-6">
              
              {/* 解放済み画像 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <Unlock className="w-5 h-5 text-green-600" />
                      <span>{t('unlocked.title')}</span>
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {t('unlocked.subtitle', { count: unlockedImages.length })}
                    </p>
                  </div>
                </div>

                {unlockedImages.length > 0 ? (
                  <div className={`grid gap-6 ${
                    viewMode === 'grid' 
                      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                      : 'grid-cols-1'
                  }`}>
                    {unlockedImages.map((image, index) => {
                      const levelStyle = getUnlockLevelStyle(image.unlockLevel);
                      return (
                      <div key={index} className={`border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow ${levelStyle.container} ${levelStyle.border}`}>
                        {levelStyle.glow && <div className={levelStyle.glow}></div>}
                        <div 
                          className="aspect-w-16 aspect-h-12 bg-white border border-gray-200 relative cursor-pointer group"
                          onClick={() => handleImageClick(image)}
                        >
                          <Image 
                            src={image.url} 
                            alt={image.title[locale as keyof typeof image.title] || 'Character gallery image'}
                            width={400}
                            height={192}
                            className="w-full h-48 object-contain group-hover:scale-105 transition-transform duration-300 p-2"
                          />
                          
                          {/* ホバー時のズームアイコン */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                          
                          {/* レアリティバッジ */}
                          <div className="absolute top-2 left-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRarityColor(image.rarity)}`}>
                              {getRarityText(image.rarity)}
                            </span>
                          </div>
                          
                          {/* 解放レベルバッジ */}
                          <div className="absolute top-2 right-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border flex items-center space-x-1 ${levelStyle.badge}`}>
                              <Heart className="w-3 h-3" />
                              <span>{image.unlockLevel}</span>
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <h4 className="font-medium text-gray-900 mb-2">
                            {image.title[locale as keyof typeof image.title] || image.title.ja || t('modal.imageTitle')}
                          </h4>
                          <p className="text-sm text-gray-600 mb-3">
                            {image.description[locale as keyof typeof image.description] || image.description.ja || ''}
                          </p>
                          
                          {/* タグ */}
                          {image.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {image.tags.map((tag, tagIndex) => (
                                <span 
                                  key={tagIndex}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Unlock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('unlocked.empty.title')}</h3>
                    <p className="text-gray-500">
                      {t('unlocked.empty.description')}
                    </p>
                  </div>
                )}
              </div>

              {/* ロック中画像（プレビュー） */}
              {lockedImages.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <Lock className="w-5 h-5 text-gray-400" />
                        <span>{t('locked.title')}</span>
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {t('locked.subtitle', { count: lockedImages.length })}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                        <span className="hidden sm:inline">{viewMode === 'grid' ? t('view.list') : t('view.grid')}</span>
                      </button>
                    </div>
                  </div>

                  <div className={`grid gap-6 ${ 
                    viewMode === 'grid' 
                      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                      : 'grid-cols-1'
                  }`}>
                    {lockedImages.map((image, index) => {
                      const levelStyle = getUnlockLevelStyle(image.unlockLevel);
                      return (
                      <div key={index} className={`border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow relative group cursor-pointer ${levelStyle.container} ${levelStyle.border}`}>
                        {levelStyle.glow && <div className={levelStyle.glow}></div>}
                        <div 
                          className="aspect-w-16 aspect-h-12 bg-white border border-gray-200 relative cursor-pointer group"
                        >
                          {/* ブラー処理された画像 */}
                          <Image 
                            src={image.url} 
                            alt={t('locked.imageTitle')}
                            width={400}
                            height={192}
                            className="w-full h-48 object-contain filter blur-md scale-110 p-2"
                          />
                          
                          {/* 通常オーバーレイ（非ホバー時） */}
                          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/50 flex items-center justify-center group-hover:opacity-0 transition-opacity duration-300">
                            <div className="text-center">
                              <Lock className="w-6 h-6 text-white mb-1 mx-auto drop-shadow-md" />
                              <span className="text-white text-xs font-medium drop-shadow-md">
                                {t('character.level', { level: image.unlockLevel })}
                              </span>
                            </div>
                          </div>
                          
                          {/* ホバー効果（ホバー時のみ） */}
                          <div className="absolute inset-0 bg-purple-500/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <div className="text-center text-white">
                              <Heart className="w-8 h-8 mx-auto mb-2 animate-pulse drop-shadow-lg" />
                              <span className="text-sm font-bold drop-shadow-lg bg-black/50 px-3 py-1 rounded-full">
                                {t('locked.hoverMessage')}
                              </span>
                            </div>
                          </div>
                          
                          {/* 解放レベル表示 */}
                          <div className="absolute top-1 right-1">
                            <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full border flex items-center space-x-1 shadow-md ${levelStyle.badge || 'bg-red-500 text-white border-red-400'}`}>
                              <Heart className="w-2.5 h-2.5" />
                              <span>{image.unlockLevel}</span>
                            </span>
                          </div>

                          {/* レアリティ表示 */}
                          <div className="absolute top-1 left-1">
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full border shadow-md ${getRarityColor(image.rarity)}`}>
                              {getRarityText(image.rarity)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <h4 className="font-medium text-gray-900 mb-2">
                            {image.title[locale as keyof typeof image.title] || image.title.ja || t('modal.imageTitle')}
                          </h4>
                          <p className="text-sm text-gray-600 mb-3">
                            {t('locked.unlockLevel', { level: image.unlockLevel })}
                          </p>
                          
                          {/* タグ */}
                          {image.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {image.tags.map((tag, tagIndex) => (
                                <span 
                                  key={tagIndex}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noCharacter.title')}</h3>
              <p className="text-gray-500">
                {t('noCharacter.description')}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 画像モーダル */}
      {showModal && selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="relative max-w-4xl max-h-full bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRarityColor(selectedImage.rarity)}`}>
                    {getRarityText(selectedImage.rarity)}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 border border-green-200 flex items-center space-x-1">
                    <Heart className="w-3 h-3" />
                    <span>{selectedImage.unlockLevel}</span>
                  </span>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full transition-colors text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* モーダル画像 - 白背景で透過PNG対応 */}
            <div className="relative bg-white p-8">
              <Image
                src={selectedImage.url}
                alt={selectedImage.title[locale] || t('modal.altText')}
                width={800}
                height={600}
                className="w-full max-h-[70vh] object-contain mx-auto"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* モーダル情報部分 */}
            <div className="bg-white border-t border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {selectedImage.title[locale] || selectedImage.title.ja || t('modal.imageTitle')}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {selectedImage.description[locale] || selectedImage.description.ja || ''}
              </p>
              
              {/* タグ */}
              {selectedImage.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedImage.tags.map((tag: string, tagIndex: number) => (
                    <span 
                      key={tagIndex}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* モーダル背景クリックで閉じる */}
          <div 
            className="absolute inset-0 -z-10"
            onClick={closeModal}
          />
        </div>
      )}
      </div>
    </div>
  );
}