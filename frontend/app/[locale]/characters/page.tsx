'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Users, Search, Filter } from 'lucide-react';
import CharacterGrid from '@/components/characters/CharacterGrid';
import CharacterFilters from '@/components/characters/CharacterFilters';
import UserSidebar from '@/components/user/UserSidebar';
import { getAuthHeaders } from '@/utils/auth';

interface Character {
  _id: string;
  name: string;
  description: string;
  personalityPreset: string;
  personalityTags: string[];
  gender: string;
  characterAccessType: 'free' | 'token-based' | 'premium';
  imageCharacterSelect?: string;
  affinityStats?: {
    totalUsers: number;
    averageLevel: number;
  };
}

interface FilterState {
  keyword: string;
  characterType: 'all' | 'free' | 'purchased' | 'unpurchased';
  sort: 'popular' | 'newest' | 'oldest' | 'name' | 'affinity';
}

function CharactersPageContent({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = React.use(params);
  const locale = resolvedParams.locale || 'ja';
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('characters');

  const [characters, setCharacters] = useState<Character[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    characterType: 'all',
    sort: 'popular'
  });
  const [isLoading, setIsLoading] = useState(false); // 初期ローディングも無効化
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const fetchCharacters = useCallback(async () => {
    try {
      // setIsLoading(true); // ローディング表示を無効化
      setError(null);

      const queryParams = new URLSearchParams({
        locale,
        characterType: filters.characterType,
        sort: filters.sort,
        ...(filters.keyword && { keyword: filters.keyword })
      });

      console.log('🔍 フロントエンド: 送信するパラメータ', {
        locale,
        characterType: filters.characterType,
        sort: filters.sort,
        keyword: filters.keyword
      });
      console.log('🔍 フロントエンド: APIリクエストURL', `/api/characters?${queryParams}`);

      const response = await fetch(`/api/characters?${queryParams}`, {
        headers: {
          ...getAuthHeaders(),
          'Cache-Control': 'no-store'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setCharacters(data.characters || []);
      setTotalCount(data.total || 0);

    } catch (err) {
      console.error('キャラクター一覧取得エラー:', err);
      setError(err instanceof Error ? err.message : 'キャラクター一覧の取得に失敗しました');
      setCharacters([]);
      setTotalCount(0);
    } finally {
      // setIsLoading(false); // ローディング表示を無効化
    }
  }, [locale, filters]);

  // 新規会員ウェルカムモーダルチェック
  useEffect(() => {
    const isNewUser = searchParams.get('newUser') === 'true';
    if (isNewUser) {
      setShowWelcomeModal(true);
      // URLパラメータを削除（リロード時に再表示されないよう）
      const url = new URL(window.location.href);
      url.searchParams.delete('newUser');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.keyword !== undefined) {
        fetchCharacters();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, fetchCharacters]);

  const handleCharacterClick = (character: Character) => {
    if (character.characterAccessType === 'premium') {
      window.location.href = `/${locale}/purchase/character/${character._id}`;
    }
  };

  const handleRetry = () => {
    fetchCharacters();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <UserSidebar locale={locale} />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <UserSidebar locale={locale} />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="bg-red-100 rounded-full p-3 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
              <Users className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('loadError')}</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              {t('retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <UserSidebar locale={locale} />
      
      <div className="flex-1 lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('title')}
          </h1>
          <p className="text-gray-600">
            {t('subtitle')}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              <Users className="w-4 h-4 mr-1" />
              <span>{t('totalCount', { count: totalCount })}</span>
            </div>
            {/* テスト用ボタン */}
            <button
              onClick={() => setShowWelcomeModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700"
            >
              ウェルカムモーダルテスト
            </button>
          </div>
        </div>

        {/* フィルター */}
        <div className="mb-6">
          <CharacterFilters
            filters={filters}
            onFiltersChange={setFilters}
            totalCount={totalCount}
          />
        </div>

        {/* キャラクター一覧 */}
        {characters.length > 0 ? (
          <CharacterGrid
            characters={characters.map(char => ({
              ...char,
              name: typeof char.name === 'string' ? char.name : (char.name as any).ja || (char.name as any).en,
              description: typeof char.description === 'string' ? char.description : (char.description as any).ja || (char.description as any).en,
              characterAccessType: char.characterAccessType === 'free' ? 'free' : 
                                 char.characterAccessType === 'premium' ? 'premium' : 'token-based',
              imageChatAvatar: (char as any).imageChatAvatar || '/images/default-avatar.png',
              imageChatBackground: (char as any).imageChatBackground || '/images/default-bg.png',
              currentMood: (char as any).currentMood || 'happy',
              themeColor: (char as any).themeColor || '#8B5CF6'
            }))}
            onCharacterClick={(gridChar) => {
              // GridCharacterをCharacterに変換してhandleCharacterClickに渡す
              const originalChar = characters.find(c => c._id === gridChar._id);
              if (originalChar) {
                handleCharacterClick(originalChar);
              }
            }}
            userAffinities={[]} // モック環境では空配列
            userPurchasedCharacters={[]} // モック環境では空配列
            filterKey={`${filters.characterType}-${filters.sort}-${filters.keyword}`} // アニメーション用のキー
          />
        ) : (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('search.notFound')}
            </h3>
            <p className="text-gray-500 mb-4">
              {t('search.notFoundDesc')}
            </p>
            <button
              onClick={() => setFilters({ keyword: '', characterType: 'all', sort: 'popular' })}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              {t('search.resetFilters')}
            </button>
          </div>
        )}
        </div>
      </div>

      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="relative bg-gradient-to-br from-purple-600 via-pink-600 to-purple-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* 背景アニメーション */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 opacity-20 animate-pulse"></div>
            
            {/* キラキラエフェクト */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute bg-white rounded-full opacity-70 animate-ping"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    width: `${Math.random() * 4 + 2}px`,
                    height: `${Math.random() * 4 + 2}px`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${Math.random() * 2 + 1}s`
                  }}
                />
              ))}
            </div>

            {/* メインコンテンツ */}
            <div className="relative z-10 p-8 text-center text-white">
              {/* トロフィーアイコン */}
              <div className="mx-auto mb-6 w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                <svg className="w-12 h-12 text-yellow-800" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 9V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM3 11.5A1.5 1.5 0 0 0 4.5 13H5a6 6 0 0 0 6 6h2a6 6 0 0 0 6-6h.5a1.5 1.5 0 0 0 1.5-1.5v-2A1.5 1.5 0 0 0 19.5 8H19V7a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v1h-.5A1.5 1.5 0 0 0 3 9.5v2z"/>
                </svg>
              </div>

              {/* メインメッセージ */}
              <h2 className="text-3xl font-bold mb-4 animate-pulse">
                🎉 ご登録ありがとうございます！
              </h2>
              
              {/* サブメッセージ */}
              <p className="text-xl mb-6 leading-relaxed">
                新規会員登録された方には<br />
                今だけ<span className="text-yellow-300 font-bold text-2xl mx-1 animate-pulse">10,000</span>
                <span className="text-yellow-300 font-bold">トークチケット</span><br />
                プレゼント！
              </p>

              {/* トークンアイコン */}
              <div className="flex justify-center space-x-2 mb-8">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce text-yellow-800 font-bold"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    ¥
                  </div>
                ))}
              </div>

              {/* ボタン */}
              <button
                onClick={async () => {
                  setShowWelcomeModal(false);
                  
                  // ユーザーの選択済みキャラクターを取得
                  try {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    const selectedCharacterId = user.selectedCharacter;
                    
                    if (selectedCharacterId) {
                      // 選択済みキャラクターのチャット画面に遷移
                      router.push(`/${locale}/characters/${selectedCharacterId}/chat`);
                    } else {
                      // キャラクターが選択されていない場合は一覧画面に留まる
                      console.log('⚠️ No character selected');
                    }
                  } catch (error) {
                    console.error('❌ Error getting selected character:', error);
                  }
                }}
                className="bg-white text-purple-600 font-bold py-4 px-8 rounded-full text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg animate-pulse"
              >
                さっそくチャットしてみる！
              </button>

              {/* 小さなテキスト */}
              <p className="text-xs mt-4 opacity-80">
                トークチケットは自動で付与されました
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function CharactersPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">キャラクター一覧を読み込んでいます...</p>
        </div>
      </div>
    }>
      <CharactersPageContent params={params} />
    </Suspense>
  );
}