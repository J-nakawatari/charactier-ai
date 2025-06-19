'use client';

import React from 'react';
import { X, Award, Star, Target, TrendingUp, CheckCircle, Clock, Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BadgeSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
}

export default function BadgeSystemModal({ 
  isOpen, 
  onClose, 
  locale 
}: BadgeSystemModalProps) {
  const t = useTranslations('badges');
  const tCommon = useTranslations('common');
  
  if (!isOpen) return null;

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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー - 親密度モーダルと同じグラデーション */}
        <div className="sticky top-0 bg-gradient-to-r from-yellow-600 to-amber-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t('modalTitle')}</h2>
                <p className="text-yellow-100">{t('modalSubtitle')}</p>
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
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* 概要 */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-4 border border-yellow-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('whatIsBadge')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('badgeDescription')}
            </p>
          </div>

          {/* バッジの種類 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">バッジの種類</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Star className="w-6 h-6 text-green-600" />
                  <h4 className="font-semibold text-green-800">初心者向けバッジ</h4>
                </div>
                <p className="text-sm text-green-700">
                  サービスを始めたばかりの方向けのバッジです。基本的な機能の利用や初回のアクションで獲得できます。
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Target className="w-6 h-6 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">チャット系バッジ</h4>
                </div>
                <p className="text-sm text-blue-700">
                  キャラクターとの会話に関連するバッジです。メッセージ数や会話の継続日数などで獲得できます。
                </p>
              </div>

              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-pink-600" />
                  <h4 className="font-semibold text-pink-800">親密度系バッジ</h4>
                </div>
                <p className="text-sm text-pink-700">
                  キャラクターとの親密度向上に関するバッジです。特定のレベル到達や複数キャラクターとの関係構築で獲得できます。
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Award className="w-6 h-6 text-purple-600" />
                  <h4 className="font-semibold text-purple-800">特別バッジ</h4>
                </div>
                <p className="text-sm text-purple-700">
                  特定の条件や期間限定イベントで獲得できる特別なバッジです。希少価値の高いバッジも含まれます。
                </p>
              </div>
            </div>
          </div>

          {/* 獲得方法 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">バッジの獲得方法</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">自動獲得</h4>
                  <p className="text-sm text-gray-600">条件を満たすと自動的にバッジが獲得されます。獲得時には通知でお知らせします。</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">進捗追跡</h4>
                  <p className="text-sm text-gray-600">未獲得のバッジでは進捗状況を確認できます。どのくらい達成に近づいているかが分かります。</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Gift className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">特典</h4>
                  <p className="text-sm text-gray-600">一部のバッジには特別な特典が付いている場合があります。（今後実装予定）</p>
                </div>
              </div>
            </div>
          </div>

          {/* 獲得のコツ */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">バッジ獲得のコツ</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start space-x-2">
                <span className="text-yellow-500 font-bold">•</span>
                <span>毎日キャラクターと会話を続けることで、継続関連のバッジを獲得できます</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-yellow-500 font-bold">•</span>
                <span>複数のキャラクターと交流することで、幅広いバッジを獲得できます</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-yellow-500 font-bold">•</span>
                <span>親密度を計画的に上げることで、親密度関連のバッジを効率よく獲得できます</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-yellow-500 font-bold">•</span>
                <span>プロフィール設定やサービス機能の活用でも初心者バッジを獲得できます</span>
              </li>
            </ul>
          </div>

          {/* 注意事項 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">ご注意</h3>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>• バッジは一度獲得すると削除されることはありません</li>
              <li>• 一部のバッジは期間限定で獲得可能な場合があります</li>
              <li>• バッジの条件や種類は今後のアップデートで追加される可能性があります</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}