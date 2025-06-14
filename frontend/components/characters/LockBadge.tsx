'use client';

import React from 'react';
import { Lock, Unlock, Gift, Zap, DollarSign } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface LockBadgeProps {
  accessType: 'free' | 'purchaseOnly';
  isLocked: boolean;
  price?: number;
  size?: 'sm' | 'md';
}

export default function LockBadge({ 
  accessType, 
  isLocked, 
  price,
  size = 'md' 
}: LockBadgeProps) {
  const t = useTranslations('characters');
  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          badge: 'px-1.5 py-0.5 text-xs',
          icon: 'w-3 h-3'
        };
      default: // md
        return {
          badge: 'px-2 py-1 text-xs',
          icon: 'w-3.5 h-3.5'
        };
    }
  };

  const sizes = getSizeClasses(size);

  // ベースキャラクターの場合
  if (accessType === 'free') {
    return (
      <div className={`inline-flex items-center space-x-1 bg-green-100 text-green-700 rounded-full font-medium ${sizes.badge}`}>
        <Gift className={sizes.icon} />
        <span>{t('characterTypes.free')}</span>
      </div>
    );
  }

  // プレミアキャラクターの場合
  if (accessType === 'purchaseOnly') {
    if (isLocked) {
      // 未購入の場合
      return (
        <div className={`inline-flex items-center space-x-1 bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-700 rounded-full font-medium border border-amber-200 ${sizes.badge}`}>
          <Lock className={sizes.icon} />
          <span>
            {price ? `¥${price.toLocaleString()}` : t('characterTypes.premium')}
          </span>
        </div>
      );
    } else {
      // 購入済みの場合（解錠アイコンを使用）
      return (
        <div className={`inline-flex items-center space-x-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 rounded-full font-medium border border-amber-300 ${sizes.badge}`}>
          <Unlock className={sizes.icon} />
          <span>{t('actions.unlock')}</span>
        </div>
      );
    }
  }

  // その他の場合（フォールバック）
  return (
    <div className={`inline-flex items-center space-x-1 bg-gray-100 text-gray-700 rounded-full font-medium ${sizes.badge}`}>
      <Lock className={sizes.icon} />
      <span>{t('characterTypes.locked')}</span>
    </div>
  );
}