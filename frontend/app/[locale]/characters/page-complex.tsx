'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Users, AlertCircle, RefreshCw } from 'lucide-react';
import CharacterGrid from '@/components/characters/CharacterGrid';
import CharacterFilters from '@/components/characters/CharacterFilters';

interface Character {
  _id: string;
  name: string;
  description: string;
  personalityPreset: string;
  personalityTags: string[];
  gender: string;
  characterAccessType: 'initial' | 'premium';
  imageCharacterSelect?: string;
  imageChatAvatar?: string;
  affinityStats?: {
    totalUsers: number;
    averageLevel: number;
  };
}

interface UserAffinity {
  characterId: string;
  level: number;
}

interface FilterState {
  keyword: string;
  freeOnly: boolean;
  sort: 'popular' | 'newest' | 'oldest' | 'name' | 'affinity';
}

interface ApiResponse {
  characters: Character[];
  total: number;
  locale: string;
  filter: {
    freeOnly: boolean;
    keyword: string;
    sort: string;
  };
}

interface UserData {
  tokenBalance: number;
  purchasedCharacters: string[];
  affinities: UserAffinity[];
}

export default function CharactersPage() {
  const params = useParams();
  const locale = params.locale as string || 'ja';

  // State管理
  const [characters, setCharacters] = useState<Character[]>([]);
  const [userData, setUserData] = useState<UserData>({
    tokenBalance: 0,
    purchasedCharacters: [],
    affinities: []
  });
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    freeOnly: false,
    sort: 'popular'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // キャラクター一覧を取得する関数
  const fetchCharacters = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        locale,
        freeOnly: filters.freeOnly.toString(),
        sort: filters.sort,
        ...(filters.keyword && { keyword: filters.keyword })
      });

      const response = await fetch(`/api/characters?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        if (response.status === 401) {
          // 認証エラーの場合はログインページにリダイレクト
          window.location.href = `/${locale}/login`;
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      setCharacters(data.characters || []);
      setTotalCount(data.total || 0);

    } catch (err) {
      console.error('キャラクター一覧取得エラー:', err);
      setError(err instanceof Error ? err.message : 'キャラクター一覧の取得に失敗しました');
      setCharacters([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [locale, filters]);

  // ユーザーデータを取得する関数
  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const user = await response.json();
        setUserData({
          tokenBalance: user.tokenBalance || 0,
          purchasedCharacters: user.purchasedCharacters?.map((p: any) => p.character) || [],
          affinities: user.affinities?.map((a: any) => ({
            characterId: a.character,
            level: a.level
          })) || []
        });
      }
    } catch (err) {
      console.error('ユーザーデータ取得エラー:', err);
      // ユーザーデータの取得に失敗してもキャラクター一覧は表示する
    }
  }, []);

  // 初期データ読み込み
  useEffect(() => {
    fetchCharacters();
    fetchUserData();
  }, [fetchCharacters, fetchUserData]);

  // フィルター変更時の処理
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  // フィルター変更時にデータを再取得
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isLoading) {
        fetchCharacters();
      }
    }, 300); // デバウンス

    return () => clearTimeout(timeoutId);
  }, [filters, fetchCharacters]);

  // キャラクタークリック時の処理
  const handleCharacterClick = (character: Character) => {
    if (character.characterAccessType === 'premium') {
      // 購入ページに遷移
      window.location.href = `/${locale}/purchase/character/${character._id}`;
    }
  };

  // リトライ処理
  const handleRetry = () => {
    fetchCharacters();
    fetchUserData();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                キャラクター一覧
              </h1>
              <p className="mt-1 text-gray-600">
                お気に入りのAIキャラクターとチャットを始めましょう
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* トークン残高表示 */}
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {userData.tokenBalance} トークン
                </span>
              </div>
              
              {/* リフレッシュボタン */}
              <button
                onClick={handleRetry}
                disabled={isLoading}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
                title="更新"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* フィルター */}
        <CharacterFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          isLoading={isLoading}
          totalCount={totalCount}
        />

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  エラーが発生しました
                </h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <div className="mt-3">
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center space-x-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>再試行</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* キャラクター一覧 */}
        <CharacterGrid
          characters={characters}
          userAffinities={userData.affinities}
          userTokenBalance={userData.tokenBalance}
          userPurchasedCharacters={userData.purchasedCharacters}
          onCharacterClick={handleCharacterClick}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}