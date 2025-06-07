'use client';

import React from 'react';
import { Lock, Gift, Zap, DollarSign } from 'lucide-react';

interface LockBadgeProps {
  accessType: 'initial' | 'premium';
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

  // ベースキャラクターの場合（新規登録の30,000トークンで利用可能）
  if (accessType === 'initial') {
    return (
      <div className={`inline-flex items-center space-x-1 bg-green-100 text-green-700 rounded-full font-medium ${sizes.badge}`}>
        <Gift className={sizes.icon} />
        <span>ベースキャラ</span>
      </div>
    );
  }

  // プレミアキャラクターの場合
  if (accessType === 'premium') {
    if (isLocked) {
      // 未購入の場合
      return (
        <div className={`inline-flex items-center space-x-1 bg-orange-100 text-orange-700 rounded-full font-medium ${sizes.badge}`}>
          <Lock className={sizes.icon} />
          <span>
            {price ? `¥${price.toLocaleString()}` : 'プレミアキャラ'}
          </span>
        </div>
      );
    } else {
      // 購入済みの場合
      return (
        <div className={`inline-flex items-center space-x-1 bg-blue-100 text-blue-700 rounded-full font-medium ${sizes.badge}`}>
          <Zap className={sizes.icon} />
          <span>利用可能</span>
        </div>
      );
    }
  }

  // その他の場合（フォールバック）
  return (
    <div className={`inline-flex items-center space-x-1 bg-gray-100 text-gray-700 rounded-full font-medium ${sizes.badge}`}>
      <Lock className={sizes.icon} />
      <span>ロック中</span>
    </div>
  );
}