'use client';

import React from 'react';
import { X, Award, Calendar, Target, CheckCircle, Clock } from 'lucide-react';
import Image from 'next/image';

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

interface BadgeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  badge: Badge | null;
  locale: string;
}

export default function BadgeDetailModal({ 
  isOpen, 
  onClose, 
  badge, 
  locale 
}: BadgeDetailModalProps) {
  
  if (!isOpen || !badge) return null;

  const getProgressPercentage = (progress: number, maxProgress: number) => {
    return maxProgress > 0 ? (progress / maxProgress) * 100 : 0;
  };

  const getBadgeType = (name: string) => {
    const nameStr = locale === 'ja' ? name : (badge.name.en || name);
    if (nameStr.includes('初心者') || nameStr.includes('Beginner')) return 'beginner';
    if (nameStr.includes('チャット') || nameStr.includes('Chat')) return 'chat';
    if (nameStr.includes('親密度') || nameStr.includes('Affinity')) return 'affinity';
    return 'general';
  };

  const getBadgeTypeInfo = (type: string) => {
    switch (type) {
      case 'beginner':
        return { color: 'text-green-600', bgColor: 'bg-green-100', label: '初心者向け' };
      case 'chat':
        return { color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'チャット系' };
      case 'affinity':
        return { color: 'text-pink-600', bgColor: 'bg-pink-100', label: '親密度系' };
      default:
        return { color: 'text-gray-600', bgColor: 'bg-gray-100', label: '一般' };
    }
  };

  const badgeType = getBadgeType(badge.name.ja);
  const typeInfo = getBadgeTypeInfo(badgeType);
  const badgeName = locale === 'ja' ? badge.name.ja : (badge.name.en || badge.name.ja);
  const badgeDescription = locale === 'ja' ? badge.description.ja : (badge.description.en || badge.description.ja);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 ${typeInfo.bgColor} rounded-lg`}>
              <Award className={`w-5 h-5 ${typeInfo.color}`} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">バッジ詳細</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          {/* バッジ情報 */}
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              {badge.iconUrl ? (
                <Image
                  src={badge.iconUrl}
                  alt={badgeName}
                  fill
                  className={`object-cover rounded-full ${!badge.isUnlocked ? 'filter blur-sm grayscale' : ''}`}
                />
              ) : (
                <div className={`w-full h-full rounded-full ${typeInfo.bgColor} flex items-center justify-center ${!badge.isUnlocked ? 'filter blur-sm grayscale' : ''}`}>
                  <Award className={`w-12 h-12 ${typeInfo.color}`} />
                </div>
              )}
              {badge.isUnlocked && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-2">{badgeName}</h3>
            
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${typeInfo.bgColor} ${typeInfo.color} mb-4`}>
              {typeInfo.label}
            </div>
          </div>

          {/* 説明 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">説明</h4>
            <p className="text-gray-700 text-sm leading-relaxed">{badgeDescription}</p>
          </div>

          {/* ステータス */}
          <div className="space-y-4">
            {badge.isUnlocked ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">獲得済み</span>
                </div>
                {badge.unlockedAt && (
                  <div className="flex items-center space-x-2 text-sm text-green-700">
                    <Calendar className="w-4 h-4" />
                    <span>
                      獲得日時: {new Date(badge.unlockedAt).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-800">獲得条件</span>
                </div>
                
                {badge.progress !== undefined && badge.maxProgress !== undefined ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">進捗</span>
                      <span className="font-medium text-gray-900">
                        {badge.progress} / {badge.maxProgress}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage(badge.progress, badge.maxProgress)}%` }}
                      />
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {Math.round(getProgressPercentage(badge.progress, badge.maxProgress))}% 完了
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    条件を満たすと自動的に獲得されます
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 達成のヒント */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800">達成のヒント</span>
            </div>
            <p className="text-sm text-blue-700">
              {badgeType === 'chat' && 'キャラクターとの会話を続けて条件を満たしましょう。'}
              {badgeType === 'affinity' && 'キャラクターとの親密度を上げることで獲得できます。'}
              {badgeType === 'beginner' && 'サービスの基本機能を利用することで獲得できます。'}
              {badgeType === 'general' && 'サービスを継続して利用することで獲得できます。'}
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}