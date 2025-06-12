'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Search, Filter, SortAsc, X } from 'lucide-react';

interface FilterState {
  keyword: string;
  characterType: 'all' | 'free' | 'purchased' | 'unpurchased'; // キャラクター種別フィルター
  sort: 'popular' | 'newest' | 'oldest' | 'name' | 'affinity';
}

interface CharacterFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isLoading?: boolean;
  totalCount?: number;
}

export default function CharacterFilters({ 
  filters, 
  onFiltersChange, 
  isLoading = false,
  totalCount = 0
}: CharacterFiltersProps) {
  const t = useTranslations('characters');
  const tCommon = useTranslations('common');
  
  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearKeyword = () => {
    updateFilter('keyword', '');
  };

  const resetFilters = () => {
    onFiltersChange({
      keyword: '',
      characterType: 'all',
      sort: 'popular'
    });
  };

  const sortOptions = [
    { value: 'popular', label: t('sort.popular') },
    { value: 'newest', label: t('sort.newest') },
    { value: 'oldest', label: t('sort.oldest') },
    { value: 'name', label: t('sort.name') },
    { value: 'affinity', label: t('sort.affinity') }
  ];

  const hasActiveFilters = filters.keyword || filters.characterType !== 'all' || filters.sort !== 'popular';

  const characterTypeOptions = [
    { value: 'all', label: t('filters.all') },
    { value: 'free', label: t('filters.free') },
    { value: 'purchased', label: t('filters.purchased') },
    { value: 'unpurchased', label: t('filters.unpurchased') }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      {/* 検索バー */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={filters.keyword}
          onChange={(e) => updateFilter('keyword', e.target.value)}
          placeholder={t('search.placeholder')}
          disabled={isLoading}
          className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 text-gray-900 placeholder-gray-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
        {filters.keyword && (
          <button
            onClick={clearKeyword}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* フィルターとソート */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* キャラクター種別フィルター */}
          <div>
            {/* モバイル: プルダウン */}
            <div className="flex items-center space-x-2 sm:hidden">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filters.characterType}
                onChange={(e) => updateFilter('characterType', e.target.value)}
                disabled={isLoading}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed min-w-0 text-gray-900 bg-white"
              >
                {characterTypeOptions.map((option) => (
                  <option key={option.value} value={option.value} className="text-gray-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* PC: ラジオボタン */}
            <div className="hidden sm:flex items-center space-x-4">
              <Filter className="h-4 w-4 text-gray-400" />
              <div className="flex space-x-4">
                {characterTypeOptions.map((option) => (
                  <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="characterType"
                      value={option.value}
                      checked={filters.characterType === option.value}
                      onChange={(e) => updateFilter('characterType', e.target.value)}
                      disabled={isLoading}
                      className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm font-medium text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ソート */}
          <div className="flex items-center space-x-2">
            <SortAsc className="h-4 w-4 text-gray-400" />
            <select
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              disabled={isLoading}
              className="text-sm border-0 bg-transparent text-gray-700 focus:ring-0 focus:outline-none cursor-pointer disabled:cursor-not-allowed"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 結果の数とリセットボタン */}
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <span className="text-sm text-gray-600">
            {totalCount > 0 && t('totalCount', { count: totalCount })}
          </span>
          
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              disabled={isLoading}
              className="flex items-center space-x-1 text-sm text-purple-600 hover:text-purple-700 disabled:cursor-not-allowed"
            >
              <Filter className="h-3 w-3" />
              <span>{tCommon('reset')}</span>
            </button>
          )}
        </div>
      </div>

      {/* アクティブフィルターの表示 */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {filters.keyword && (
              <span className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                <span>検索: {filters.keyword}</span>
                <button
                  onClick={clearKeyword}
                  className="text-purple-500 hover:text-purple-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            
            
            {filters.sort !== 'popular' && (
              <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                <span>{sortOptions.find(o => o.value === filters.sort)?.label}</span>
                <button
                  onClick={() => updateFilter('sort', 'popular')}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}