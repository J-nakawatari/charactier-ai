'use client';

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import Image from 'next/image';
import { Send, Heart, Zap, Settings, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/hooks/useLocale';
import { MessageList } from './MessageList';
import { AffinityBar } from './AffinityBar';
import { MoodVisualizer } from './MoodVisualizer';
import { TokenBar } from './TokenBar';
import { UnlockPopup } from './UnlockPopup';
import { TokenPurchaseModal } from './TokenPurchaseModal';
import { ChatInput } from './ChatInput';
import UserSidebar from '../user/UserSidebar';
import { TypingIndicator } from './TypingIndicator';
import { ConnectionIndicator } from './ConnectionIndicator';
import AdvancedChatIndicators from './AdvancedChatIndicators';
import { useRealtimeChat, useTypingDebounce, useChatConnectionStatus } from '@/hooks/useRealtimeChat';
import { useAffinityStore } from '@/store/affinityStore';
import { getMoodBackgroundGradient } from '@/utils/moodUtils';
import { getAuthHeaders } from '@/utils/auth';
import { getSafeImageUrl } from '@/utils/imageUtils';
import { validateMessageBeforeSend } from '@/utils/contentFilter';
import * as gtag from '@/lib/gtag';

interface Character {
  _id: string;
  name: string;
  description: string;
  // 🖼️ 画像フィールド（CharacterModel.tsと一致）
  imageCharacterSelect?: string;
  imageDashboard?: string;
  imageChatBackground?: string;
  imageChatAvatar?: string;
  // 🎭 その他のフィールド
  currentMood: 'happy' | 'sad' | 'angry' | 'shy' | 'excited';
  themeColor: string;
  // 🤖 AIモデル情報
  aiModel?: string;
  model?: string;
  // 💬 プロンプト情報
  personalityPrompt?: string;
  adminPrompt?: string;
}

interface UserCharacterAffinity {
  level: number;
  currentExp: number;
  nextLevelExp: number;
  unlockedIllustrations: string[];
}

interface TokenStatus {
  tokensRemaining: number;
  lastMessageCost: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens?: number;
}

interface ChatLayoutProps {
  character: Character;
  affinity: UserCharacterAffinity;
  tokenStatus: TokenStatus;
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onTokenPurchaseSuccess?: () => void;
}

export const ChatLayout = memo(function ChatLayout({ 
  character, 
  affinity, 
  tokenStatus, 
  messages, 
  onSendMessage,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  onTokenPurchaseSuccess
}: ChatLayoutProps) {
  const t = useTranslations('chatLayout');
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>(messages);

  // 親からのmessagesプロパティが更新された時にlocalMessagesを同期
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);
  const [showUnlockPopup, setShowUnlockPopup] = useState(false);
  const [unlockData, setUnlockData] = useState<{ level: number; illustration: string } | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [currentTokens, setCurrentTokens] = useState(tokenStatus.tokensRemaining);
  const [showAdvanced, setShowAdvanced] = useState(false); // 🎯 高度機能表示切り替え
  const refreshTokenBalanceRef = useRef<() => Promise<void>>();
  
  // 🎭 親密度ストアの初期化
  const { updateAffinity } = useAffinityStore();
  
  // 🎨 感情に基づく背景スタイル
  const currentMood = (affinity as any).currentMood || 'neutral';
  const moodGradient = useMemo(() => getMoodBackgroundGradient(currentMood), [currentMood]);
  
  // デバッグ: 画像URLを確認
  useEffect(() => {
    console.log('ChatLayout - Character images:', {
      characterId: character._id,
      imageChatBackground: character.imageChatBackground,
      imageChatAvatar: character.imageChatAvatar,
      imageCharacterSelect: character.imageCharacterSelect
    });
  }, [character]);
  
  // リアルタイムチャット機能
  const realtimeChat = useRealtimeChat(character._id);
  const connectionStatus = useChatConnectionStatus();
  
  // タイピングデバウンス
  const { handleTyping, stopTyping } = useTypingDebounce(
    realtimeChat.startTyping,
    realtimeChat.stopTyping,
    1500
  );

  // 親からのtokenStatusが更新された時にcurrentTokensを同期
  useEffect(() => {
    setCurrentTokens(tokenStatus.tokensRemaining);
  }, [tokenStatus.tokensRemaining]);

  // Google Analytics: チャット開始イベント（初回のみ）
  useEffect(() => {
    gtag.chatStart(character._id, character.name);
  }, [character._id, character.name]);

  // 🎭 初期データでAffinityStoreを更新
  useEffect(() => {
    updateAffinity({
      level: affinity.level,
      experience: affinity.currentExp,
      mood: (affinity as any).currentMood || 'neutral'
    });
  }, [affinity, updateAffinity]);

  // 🎉 レベルアップイベントリスナー
  useEffect(() => {
    const handleLevelUp = (event: CustomEvent) => {
      setUnlockData({
        level: event.detail.level,
        illustration: event.detail.illustration
      });
      setShowUnlockPopup(true);
      
      // Google Analytics: 親密度レベルアップイベント
      gtag.affinityLevelUp(character._id, event.detail.level);
    };

    window.addEventListener('levelUp', handleLevelUp as EventListener);
    
    return () => {
      window.removeEventListener('levelUp', handleLevelUp as EventListener);
    };
  }, [character._id]);

  // 💰 トークン購入モーダル表示イベントリスナー
  useEffect(() => {
    const handleShowTokenPurchase = (event: CustomEvent) => {
      console.log('🛒 Token purchase modal triggered:', event.detail);
      setShowPurchaseModal(true);
    };

    window.addEventListener('showTokenPurchaseModal', handleShowTokenPurchase as EventListener);
    
    return () => {
      window.removeEventListener('showTokenPurchaseModal', handleShowTokenPurchase as EventListener);
    };
  }, []);



  // 定期的にトークン残高を更新する関数
  const refreshTokenBalance = useCallback(async () => {
    try {
      // TODO: 適切なユーザー情報取得APIに変更
      const response = await fetch('/api/user/profile', {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const userData = await response.json();
        const newTokens = userData.tokenBalance || userData.user?.tokenBalance;
        if (newTokens !== undefined) {
          setCurrentTokens(newTokens);
        }
      }
    } catch (error) {
      console.error('Token balance refresh failed:', error);
    }
  }, []); // 依存関係を削除して無限ループを防止

  // ref に最新の関数を保持
  refreshTokenBalanceRef.current = refreshTokenBalance;

  // トークン残高の更新はTokenBarコンポーネントに完全に委譲
  // ChatLayoutでの重複した更新処理をすべて無効化
  // TokenBarが以下を担当:
  // - 60秒ごとの定期更新
  // - visibilitychangeイベントでの更新
  // - 購入完了イベントでの更新

  const handleSendMessage = useCallback(async (messageToSend: string) => {
    if (!messageToSend.trim() || isLoading) return;

    setIsLoading(true);

    try {
      // 親コンポーネントのonSendMessage関数を呼び出し
      // メッセージの更新は親コンポーネントで管理される
      
      // 禁止用語チェック（フロントエンド側）
      const validation = validateMessageBeforeSend(messageToSend);
      
      // フロントエンドの禁止用語チェックは一時的に無効化
      // バックエンドの制裁システムをテストするため
      
      // タイピング停止とキャラクタータイピング開始
      stopTyping();
      realtimeChat.setCharacterTyping(true);
      
      // Google Analytics: メッセージ送信イベント
      gtag.messageSent(character._id, messageToSend.length);
      
      await onSendMessage(messageToSend);
      

      // レベルアップ演出のトリガーは削除（実際のレベルアップ情報に基づいて表示）

    } catch (error) {
      console.error('Message send error:', error);
    } finally {
      setIsLoading(false);
      realtimeChat.setCharacterTyping(false);
    }
  }, [isLoading, character._id, onSendMessage, stopTyping, realtimeChat]);

  return (
    <div className="flex h-screen">
      {/* サイドバー */}
      <UserSidebar locale="ja" />
      
      {/* メインチャットエリア */}
      <div 
        className="flex-1 flex flex-col relative lg:ml-64 transition-all duration-1000 ease-in-out"
        style={{
          backgroundImage: moodGradient.background,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* 感情に基づく背景オーバーレイ */}
        <div className={`absolute inset-0 backdrop-blur-sm transition-all duration-1000 ease-in-out ${moodGradient.overlay}`}></div>
      
      {/* ヘッダー */}
      <header className="relative z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200/50 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between max-w-4xl mx-auto">
          {/* モバイル: TokenBarを上に配置、デスクトップ: 左側にキャラクター情報 */}
          <div className="sm:hidden mb-2">
            <TokenBar 
              lastMessageCost={tokenStatus.lastMessageCost}
              onPurchaseClick={() => setShowPurchaseModal(true)}
              onTokenUpdate={(newTokens) => setCurrentTokens(newTokens)}
            />
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            {useMemo(() => (
              <div className="hidden sm:block w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                <Image 
                  src={getSafeImageUrl(character.imageChatAvatar || character.imageCharacterSelect, character.name)} 
                  alt={character.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  style={{ backgroundColor: 'transparent' }}
                  unoptimized={true}
                  placeholder="empty"
                  onError={(e) => {
                    console.error('ChatLayout Avatar image loading error:', {
                      characterId: character._id,
                      finalSrc: getSafeImageUrl(character.imageChatAvatar || character.imageCharacterSelect, character.name)
                    });
                  }}
                />
              </div>
            ), [character.imageChatAvatar, character.imageCharacterSelect, character.name, character._id])}
            <div className="hidden sm:block">
              <h1 className="font-semibold text-gray-900 text-base">{character.name}</h1>
              {/* 🎭 高度機能表示 */}
              <AdvancedChatIndicators 
                characterId={character._id}
                affinityLevel={affinity.level}
                currentMood={(affinity as any).currentMood || 'neutral'}
                className="mt-1"
              />
            </div>
          </div>

          {/* デスクトップ: 右側にTokenBarと高度機能ボタン */}
          <div className="hidden sm:flex items-center space-x-2">
            {/* 🎯 高度機能表示切り替え */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-2 rounded-lg transition-colors ${
                showAdvanced 
                  ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
              title={showAdvanced ? t('advancedOff') : t('advancedOn')}
            >
              {showAdvanced ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <TokenBar 
              lastMessageCost={tokenStatus.lastMessageCost}
              onPurchaseClick={() => setShowPurchaseModal(true)}
              onTokenUpdate={(newTokens) => setCurrentTokens(newTokens)}
            />
          </div>
        </div>
      </header>

      {/* 親密度バー */}
      <div className={`relative z-10 bg-white/75 backdrop-blur-sm border-b border-gray-200/50 transition-all duration-1000 ease-in-out`}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <AffinityBar 
            level={affinity.level}
            currentExp={affinity.currentExp}
            nextLevelExp={affinity.nextLevelExp}
            themeColor={character.themeColor}
            mood={(affinity as any).currentMood || 'neutral'}
            characterId={character._id}
            onAffinityUpdate={(newAffinity) => {
              // Affinity update handled silently
            }}
          />
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 relative z-10 overflow-hidden" style={{ backgroundColor: 'transparent' }}>
        {/* キャラクター画像（真ん中に配置） */}
        {useMemo(() => character.imageChatBackground && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <Image 
              src={getSafeImageUrl(character.imageChatBackground, character.name)}
              alt={`${character.name}のキャラクター画像`}
              width={600}
              height={800}
              className="object-contain opacity-100"
              style={{ 
                maxWidth: '90%',
                maxHeight: '90%',
                width: 'auto',
                height: 'auto',
                bottom: 0,
                position: 'absolute'
              }}
              priority
              placeholder="empty"
              onError={(e) => {
                console.error('ChatLayout background image loading error:', {
                  characterId: character._id,
                  imageChatBackground: character.imageChatBackground,
                  finalSrc: getSafeImageUrl(character.imageChatBackground, character.name)
                });
              }}
            />
          </div>
        ), [character.imageChatBackground, character.name, character._id])}
        
        <MessageList 
          messages={localMessages}
          character={character}
          isLoading={isLoading}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          showAdvanced={showAdvanced}
          affinityLevel={affinity.level}
        />
      </div>

      {/* 入力エリア */}
      <div className="relative z-10 bg-white/90 backdrop-blur-sm border-t border-gray-200/50 p-3 sm:p-4">
        <ChatInput
          characterName={character.name}
          themeColor={character.themeColor}
          lastMessageCost={tokenStatus.lastMessageCost}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          onStopTyping={stopTyping}
        />
      </div>

        {/* アンロック演出ポップアップ */}
        {showUnlockPopup && unlockData && (
          <UnlockPopup
            level={unlockData.level}
            illustration={unlockData.illustration}
            characterName={character.name}
            onClose={() => setShowUnlockPopup(false)}
          />
        )}

        {/* トークン購入モーダル */}
        <TokenPurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          currentTokens={currentTokens}
          onPurchaseSuccess={(newTokens) => {
            setCurrentTokens(newTokens);
            setShowPurchaseModal(false);
            // チャットデータを再読み込み
            if (onTokenPurchaseSuccess) {
              onTokenPurchaseSuccess();
            }
          }}
        />
      </div>
    </div>
  );
});