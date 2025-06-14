'use client';

import React, { useState } from 'react';
import { Award, Lock, CheckCircle, Star, Target, TrendingUp } from 'lucide-react';
import BadgeSystemModal from './BadgeSystemModal';

interface LocalizedString {
  ja: string;
  en: string;
}

interface Badge {
  _id: string;
  name: LocalizedString;
  description: LocalizedString;
  iconUrl: string;
  isUnlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

interface BadgeGalleryProps {
  badges: Badge[];
  locale: string;
}

export default function BadgeGallery({ badges, locale }: BadgeGalleryProps) {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  
  const unlockedCount = (badges || []).filter(badge => badge.isUnlocked).length;
  const totalCount = Math.max((badges || []).length, 1); // 0で除算を防ぐ
  
  const filteredBadges = (badges || []).filter(badge => {
    switch (filter) {
      case 'unlocked':
        return badge.isUnlocked;
      case 'locked':
        return !badge.isUnlocked;
      default:
        return true;
    }
  });

  const getProgressPercentage = (progress?: number, maxProgress?: number) => {
    if (!progress || !maxProgress) return 0;
    return Math.min((progress / maxProgress) * 100, 100);
  };

  const getBadgeIcon = (iconUrl: string, isUnlocked: boolean) => {
    // アイコンURLに基づいてフォールバックアイコンを選択
    if (iconUrl.includes('beginner')) {
      return <Star className={`w-6 h-6 ${isUnlocked ? 'text-yellow-500' : 'text-gray-400'}`} />;
    } else if (iconUrl.includes('chat')) {
      return <Target className={`w-6 h-6 ${isUnlocked ? 'text-blue-500' : 'text-gray-400'}`} />;
    } else if (iconUrl.includes('affinity')) {
      return <TrendingUp className={`w-6 h-6 ${isUnlocked ? 'text-pink-500' : 'text-gray-400'}`} />;
    } else {
      return <Award className={`w-6 h-6 ${isUnlocked ? 'text-purple-500' : 'text-gray-400'}`} />;
    }
  };

  const handleSystemModalOpen = () => {
    setIsSystemModalOpen(true);
  };

  const handleSystemModalClose = () => {
    setIsSystemModalOpen(false);
  };

  const formatUnlockDate = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Award className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">バッジコレクション</h3>
            <p className="text-sm text-gray-600">
              {unlockedCount} / {(badges || []).length} 獲得済み
            </p>
          </div>
        </div>
        
        {/* 達成率 */}
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {(badges || []).length === 0 ? '0' : Math.round((unlockedCount / (badges || []).length) * 100)}%
          </div>
          <div className="text-sm text-gray-500">達成率</div>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300"
            style={{ 
              width: `${(badges || []).length === 0 ? 0 : (unlockedCount / (badges || []).length) * 100}%` 
            }}
          />
        </div>
      </div>

      {/* フィルター */}
      <div className="flex space-x-2 mb-4">
        {[
          { key: 'all', label: 'すべて' },
          { key: 'unlocked', label: '獲得済み' },
          { key: 'locked', label: '未獲得' }
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as any)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === item.key
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* バッジグリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredBadges.map((badge) => (
          <div
            key={badge._id}
            className={`relative p-4 border rounded-lg transition-all ${
              badge.isUnlocked
                ? 'border-yellow-200 bg-yellow-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            {/* アンロック状態インジケーター */}
            {badge.isUnlocked && (
              <div className="absolute top-2 right-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            )}
            
            {/* ロック中のブラー効果 */}
            <div className={badge.isUnlocked ? '' : 'filter blur-sm'}>
              {/* バッジアイコンとタイトル */}
              <div className="flex items-center space-x-3 mb-3">
                <div className={`p-3 rounded-lg ${
                  badge.isUnlocked ? 'bg-white' : 'bg-gray-200'
                }`}>
                  {getBadgeIcon(badge.iconUrl, badge.isUnlocked)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium truncate ${
                    badge.isUnlocked ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {badge.name[locale as keyof LocalizedString]}
                  </h4>
                  {badge.isUnlocked && badge.unlockedAt && (
                    <p className="text-xs text-gray-500">
                      {formatUnlockDate(badge.unlockedAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* 説明 */}
              <p className={`text-sm mb-3 ${
                badge.isUnlocked ? 'text-gray-700' : 'text-gray-500'
              }`}>
                {badge.description[locale as keyof LocalizedString]}
              </p>
            </div>

            {/* 進捗バー（未獲得の場合） */}
            {!badge.isUnlocked && badge.progress !== undefined && badge.maxProgress !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>進捗</span>
                  <span>{badge.progress} / {badge.maxProgress}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-300"
                    style={{ width: `${getProgressPercentage(badge.progress, badge.maxProgress)}%` }}
                  />
                </div>
              </div>
            )}

            {/* ロックオーバーレイ */}
            {!badge.isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white bg-opacity-90 rounded-lg p-2">
                  <Lock className="w-6 h-6 text-gray-400" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 空の状態 */}
      {(filteredBadges || []).length === 0 && (
        <div className="text-center py-8">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {(badges || []).length === 0 ? 'バッジシステムを準備中です...' : 
             filter === 'unlocked' ? '獲得済みのバッジがありません' : 
             filter === 'locked' ? 'すべてのバッジを獲得済みです！' : 
             'バッジがありません'}
          </p>
        </div>
      )}

      {/* フッター */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            アクティビティを通じて新しいバッジを獲得しよう！
          </p>
          <button 
            onClick={handleSystemModalOpen}
            className="text-sm text-yellow-600 hover:text-yellow-700 font-medium transition-colors"
          >
            バッジについて詳しく見る
          </button>
        </div>
      </div>

      {/* バッジシステム説明モーダル */}
      <BadgeSystemModal
        isOpen={isSystemModalOpen}
        onClose={handleSystemModalClose}
        locale={locale}
      />
    </div>
  );
}