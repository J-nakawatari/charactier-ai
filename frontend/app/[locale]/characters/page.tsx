'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Users, Search, Filter } from 'lucide-react';
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
  affinityStats?: {
    totalUsers: number;
    averageLevel: number;
  };
}

interface FilterState {
  keyword: string;
  freeOnly: boolean;
  sort: 'popular' | 'newest' | 'oldest' | 'name' | 'affinity';
}

export default function CharactersPage() {
  const params = useParams();
  const locale = params.locale as string || 'ja';

  const [characters, setCharacters] = useState<Character[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    freeOnly: false,
    sort: 'popular'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

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
          'Content-Type': 'application/json',
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
      setIsLoading(false);
    }
  }, [locale, filters]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">キャラクター一覧を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 rounded-full p-3 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">読み込みエラー</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            キャラクター一覧
          </h1>
          <p className="text-gray-600">
            お気に入りのキャラクターを見つけて、会話を楽しもう
          </p>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <Users className="w-4 h-4 mr-1" />
            <span>{totalCount}体のキャラクターが利用可能</span>
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
            characters={characters}
            onCharacterClick={handleCharacterClick}
            userAffinities={[]} // モック環境では空配列
            purchasedCharacters={[]} // モック環境では空配列
          />
        ) : (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              キャラクターが見つかりません
            </h3>
            <p className="text-gray-500 mb-4">
              検索条件を変更してもう一度お試しください
            </p>
            <button
              onClick={() => setFilters({ keyword: '', freeOnly: false, sort: 'popular' })}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              フィルターをリセット
            </button>
          </div>
        )}
      </div>
    </div>
  );
}