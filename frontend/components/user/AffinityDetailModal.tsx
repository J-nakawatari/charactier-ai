'use client';

import React, { useEffect } from 'react';
import { X, Heart, Calendar } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

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

interface AffinityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  affinities: AffinityItem[];
  locale: string;
}

export default function AffinityDetailModal({ 
  isOpen, 
  onClose, 
  affinities, 
  locale 
}: AffinityDetailModalProps) {
  const t = useTranslations('affinity');
  const tCommon = useTranslations('common');
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;

  const getProgressPercentage = (experience: number, maxExperience: number) => {
    return maxExperience > 0 ? (experience / maxExperience) * 100 : 0;
  };

  const getAffinityRank = (level: number) => {
    if (level >= 80) return { rankKey: 'master', color: 'text-purple-600', bgColor: 'bg-purple-100' };
    if (level >= 60) return { rankKey: 'expert', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (level >= 40) return { rankKey: 'closeFriend', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (level >= 20) return { rankKey: 'friend', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { rankKey: 'acquaintance', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  };


  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 bg-gradient-to-r from-pink-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t('modalTitle')}</h2>
                <p className="text-pink-100">{t('modalSubtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">

          {/* キャラクター別詳細 */}
          <div className="space-y-6">
            
            {affinities.map((affinity) => {
              const rank = getAffinityRank(affinity.level);
              
              return (
                <div
                  key={affinity.character._id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-4">
                    {/* キャラクターアバター */}
                    <div className="relative flex-shrink-0">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-3" 
                           style={{ borderColor: affinity.character.themeColor }}>
                        <Image
                          src={affinity.character.imageCharacterSelect}
                          alt={affinity.character.name[locale as keyof LocalizedString]}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* レベル表示 */}
                      <div 
                        className="absolute -bottom-2 -right-2 text-sm font-bold px-2 py-1 rounded-full text-white shadow-lg"
                        style={{ backgroundColor: affinity.character.themeColor }}
                      >
                        {t('levelUp', { level: Math.floor(affinity.level) })}
                      </div>
                    </div>

                    {/* 詳細情報 */}
                    <div className="flex-1 min-w-0">
                      {/* キャラクター名とランク */}
                      <div className="flex items-center space-x-3 mb-3">
                        <h4 className="text-xl font-semibold text-gray-900">
                          {affinity.character.name[locale as keyof LocalizedString]}
                        </h4>
                        <span 
                          className={`px-3 py-1 rounded-full text-sm font-medium ${rank.color} ${rank.bgColor}`}
                        >
                          {t(`ranks.${rank.rankKey}`)}
                        </span>
                      </div>

                      {/* 経験値詳細 */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                          <span>{t('experienceProgress', { current: affinity.experience, max: affinity.maxExperience })}</span>
                          <span className="font-medium">{t('experienceToNext', { exp: affinity.experienceToNext })}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full transition-all duration-500 shadow-sm"
                            style={{ 
                              backgroundColor: affinity.character.themeColor,
                              width: `${getProgressPercentage(affinity.experience, affinity.maxExperience)}%`
                            }}
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 親密度システム説明 */}
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('systemTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{t('expGainMethods')}</h4>
                <ul className="space-y-1">
                  <li>• {t('expGainMessage')}</li>
                  <li>• {t('expGainLongChat')}</li>
                  <li>• {t('expGainDaily')}</li>
                  <li>• {t('expGainEvent')}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{t('levelRewards')}</h4>
                <ul className="space-y-1">
                  <li>• {t('rewardLv20')}</li>
                  <li>• {t('rewardLv50')}</li>
                  <li>• {t('rewardLv100')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {t('encourageChat')}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              {tCommon('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}