'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MessageSquare, User, Sparkles, Unlock } from 'lucide-react';
import AffinityBar from './AffinityBar';
import LockBadge from './LockBadge';
import { PriceDisplay } from '../common/PriceDisplay';
import { BaseCharacter } from '../../types/common';
import { API_BASE_URL } from '@/libs/constants';
import { getSafeImageUrl } from '@/utils/imageUtils';
import { getPersonalityPresetLabel, getPersonalityTagLabel } from '@/lib/characterConstants';
import { getAuthHeadersSync } from '@/utils/auth';

interface Character extends BaseCharacter {
  affinityStats?: {
    totalUsers: number;
    averageLevel: number;
  };
}

interface CharacterCardProps {
  character: Character;
  currentAffinity?: number;
  isLocked: boolean;
  price?: number;
  onClick?: (character: Character) => void;
}

export default function CharacterCard({ 
  character, 
  currentAffinity = 0,
  isLocked,
  price,
  onClick 
}: CharacterCardProps) {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string || 'ja';
  const [showAllTags, setShowAllTags] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const t = useTranslations('characters');
  
  // デバッグ用ログ
  console.log('CharacterCard Debug:', {
    characterName: character.name,
    characterAccessType: character.characterAccessType,
    isLocked,
    price,
    stripeProductDescription: (character as any).stripeProductDescription
  });

  // 多言語対応のテキスト取得関数
  const getLocalizedText = (text: { ja: string; en: string } | string): string => {
    if (typeof text === 'string') return text;
    // ロケールに応じて適切な言語を返す
    return locale === 'en' ? (text.en || text.ja) : text.ja;
  };

  const handleClick = async () => {
    if (character.characterAccessType === 'purchaseOnly' && isLocked) {
      // キャラクター購入処理
      await handleCharacterPurchase();
    } else if (onClick) {
      onClick(character);
    }
  };

  const handleCharacterPurchase = async () => {
    try {
      setIsUpdating(true);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert(t('errors.loginRequired'));
        return;
      }

      console.log('🛒 キャラクター購入リクエスト開始:', character._id);

      // キャラクター購入のチェックアウトセッション作成（直接バックエンドアクセス）
      const authHeaders = getAuthHeadersSync();
      const headers: Record<string, string> = {
        ...(authHeaders as Record<string, string>),
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
      
      const response = await fetch(`${API_BASE_URL}/purchase/create-character-checkout-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          characterId: character._id
        })
      });

      console.log('📡 チェックアウトセッション作成レスポンス:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ チェックアウトセッション作成成功:', data);
        if (data.url) {
          // 購入中のキャラクター情報をlocalStorageに保存
          localStorage.setItem('purchasingCharacterName', getLocalizedText(character.name));
          localStorage.setItem('purchasingCharacterId', character._id);
          console.log('💾 保存した購入キャラクター情報:', {
            name: getLocalizedText(character.name),
            id: character._id
          });
          // Stripeチェックアウトページにリダイレクト
          window.location.href = data.url;
        } else {
          alert(t('errors.checkoutFailed'));
        }
      } else {
        const errorData = await response.json();
        console.error('❌ チェックアウトセッション作成失敗:', errorData);
        alert(errorData.message || t('errors.checkoutFailed'));
      }
    } catch (error) {
      console.error('キャラクター購入エラー:', error);
      alert(t('errors.purchaseError'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChatStart = async () => {
    console.log('🚀 handleChatStart called for character:', character.name, character._id);
    
    if (isUpdating) {
      console.log('⏸️ Already updating, skipping...');
      return;
    }
    
    try {
      setIsUpdating(true);
      console.log('📝 Starting character selection update...');
      
      // selectedCharacterを更新
      let token = localStorage.getItem('accessToken');
      
      // localStorageにない場合はクッキーから取得を試みる
      if (!token && typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }
      
      console.log('🔑 Token found:', !!token);
      
      if (!token) {
        console.log('❌ No token found, redirecting to login...');
        router.push(`/${locale}/login`);
        return;
      }
      
      if (token) {
        console.log('📡 Sending API request to update selectedCharacter...');
        const response = await fetch('/api/v1/user/select-character', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            characterId: character._id,
          }),
        });

        console.log('📡 API Response status:', response.status);
        if (response.ok) {
          console.log('✅ selectedCharacter updated:', getLocalizedText(character.name));
          
          // localStorageのユーザー情報も更新
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const userData = JSON.parse(userStr);
            userData.selectedCharacter = character._id;
            localStorage.setItem('user', JSON.stringify(userData));
            console.log('✅ localStorage updated with selectedCharacter:', character._id);
          }
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to update selectedCharacter:', response.status, errorText);
        }
      }
      
      // チャット画面に遷移
      console.log('🔄 Navigating to chat page...');
      router.push(`/${locale}/characters/${character._id}/chat`);
      
    } catch (error) {
      console.error('❌ Error updating selectedCharacter:', error);
      // エラーが発生してもチャット画面には遷移する
      router.push(`/${locale}/characters/${character._id}/chat`);
    } finally {
      setIsUpdating(false);
    }
  };

  const getGenderIcon = (gender: string | undefined) => {
    switch (gender) {
      case 'male':
        return '♂';
      case 'female':
        return '♀';
      default:
        return '○';
    }
  };

  const getPersonalityColor = (preset: string) => {
    const colorMap: { [key: string]: string } = {
      'おっとり系': 'bg-green-100 text-green-700',
      '元気系': 'bg-orange-100 text-orange-700',
      'クール系': 'bg-blue-100 text-blue-700',
      '真面目系': 'bg-purple-100 text-purple-700',
      'セクシー系': 'bg-pink-100 text-pink-700',
      '天然系': 'bg-yellow-100 text-yellow-700',
      'ボーイッシュ系': 'bg-indigo-100 text-indigo-700',
      'お姉さん系': 'bg-red-100 text-red-700'
    };
    return colorMap[preset] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      {/* キャラクター画像エリア */}
      <div className="relative aspect-square bg-gradient-to-br from-purple-100 to-pink-100">
        {(character.imageCharacterSelect || character.imageChatAvatar) ? (
          <Image
            src={getSafeImageUrl(
              character.imageCharacterSelect || character.imageChatAvatar, 
              getLocalizedText(character.name)
            )}
            alt={getLocalizedText(character.name)}
            fill
            className="object-cover"
            unoptimized={true}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
              <User className="w-10 h-10 text-gray-400" />
            </div>
          </div>
        )}
        
        {/* バッジエリア */}
        <div className="absolute top-2 left-2">
          <LockBadge 
            accessType={character.characterAccessType}
            isLocked={isLocked}
            price={price}
            size="sm"
          />
        </div>

        {/* 性別表示 */}
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
            {getGenderIcon(character.gender)}
          </div>
        </div>

        {/* 人気度表示 */}
        {character.affinityStats && character.affinityStats.totalUsers > 0 && (
          <div className="absolute bottom-2 right-2">
            <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-full px-2 py-1">
              <Sparkles className="w-3 h-3 text-yellow-500" />
              <span className="text-xs font-medium text-gray-700">
                {character.affinityStats.totalUsers}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* コンテンツエリア */}
      <div className="p-4 space-y-3">
        {/* キャラクター名 */}
        <div>
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">
            {getLocalizedText(character.name)}
          </h3>
          
          {/* 性格プリセット */}
          {character.personalityPreset && (
            <div className="mt-1">
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getPersonalityColor(character.personalityPreset)}`}>
                {getPersonalityPresetLabel(character.personalityPreset as any, locale as 'ja' | 'en')}
              </span>
            </div>
          )}
        </div>

        {/* 説明文 */}
        <p className="text-sm text-gray-600 leading-relaxed">
          {getLocalizedText(character.description)}
        </p>

        {/* 価格情報（有料キャラクターかつロックされている場合のみ表示） */}
        {character.characterAccessType === 'purchaseOnly' && isLocked && price && (
          <div className="mt-2 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-amber-900">
                <PriceDisplay 
                  priceJpy={price} 
                  locale={locale} 
                  className="inline text-base font-bold" 
                />
              </span>
            </div>
            {/* Stripe商品説明（将来的に追加） */}
            {(character as any).stripeProductDescription && (
              <p className="mt-1 text-xs text-amber-700">
                {(character as any).stripeProductDescription}
              </p>
            )}
          </div>
        )}

        {/* 性格タグ */}
        {character.personalityTags && character.personalityTags.length > 0 && (
          <div className="flex flex-wrap gap-1 items-start">
            {character.personalityTags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {getPersonalityTagLabel(tag, locale as 'ja' | 'en')}
              </span>
            ))}
            {character.personalityTags.length > 3 && (
              <div className="relative group inline-block" style={{ fontSize: '0.75rem' }}>
                <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded cursor-pointer hover:bg-gray-200 transition-colors">
                  {t('actions.viewAll')}
                </span>
                {/* ツールチップ - 全ての性格タグを表示 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-48 w-max min-w-32">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {character.personalityTags.map((tag, index) => (
                      <span key={index} className="bg-gray-700 px-1.5 py-0.5 rounded text-xs whitespace-nowrap">
                        {getPersonalityTagLabel(tag, locale as 'ja' | 'en')}
                      </span>
                    ))}
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 親密度バー */}
        {currentAffinity > 0 && (
          <div>
            <AffinityBar 
              level={currentAffinity} 
              size="sm"
              showLabel={true}
            />
          </div>
        )}

        {/* アクションボタン */}
        <div className="pt-2">
          {isLocked ? (
            <button
              onClick={handleClick}
              className={`w-full flex items-center justify-center space-x-2 py-4 sm:py-2.5 px-4 rounded-lg transition-colors font-medium ${
                character.characterAccessType === 'purchaseOnly' 
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white hover:from-amber-500 hover:to-yellow-600 shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {character.characterAccessType === 'purchaseOnly' ? (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>{t('actions.unlock')}</span>
                </>
              ) : (
                <span>{t('actions.needTokens')}</span>
              )}
            </button>
          ) : (
            <button
              onClick={handleChatStart}
              disabled={isUpdating}
              className="w-full flex items-center justify-center space-x-2 py-4 sm:py-2.5 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{isUpdating ? 'Loading...' : t('actions.startChat')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}