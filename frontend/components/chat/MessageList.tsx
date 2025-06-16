'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { MessageItem } from './MessageItem';
import { Loader2, ChevronUp } from 'lucide-react';
import { Message } from '@/types/common';

// ChatLayout向けの文字列ベースCharacter型
interface Character {
  _id: string;
  name: string; // すでに多言語処理済み文字列
  description: string; // すでに多言語処理済み文字列
  // 🖼️ 画像フィールド（ChatLayoutと一致）
  imageCharacterSelect?: string;
  imageDashboard?: string;
  imageChatBackground?: string;
  imageChatAvatar?: string;
  // 🎭 その他のフィールド
  currentMood: 'happy' | 'sad' | 'angry' | 'shy' | 'excited';
  themeColor: string;
}

interface MessageListProps {
  messages: Message[];
  character: Character;
  isLoading: boolean;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  showAdvanced?: boolean; // 高度情報表示フラグ
  affinityLevel?: number; // 親密度レベル（ムード情報のため）
}

export function MessageList({ 
  messages, 
  character, 
  isLoading, 
  onLoadMore, 
  hasMore = false, 
  isLoadingMore = false,
  showAdvanced = false,
  affinityLevel = 0
}: MessageListProps) {
  const [isNearTop, setIsNearTop] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef<number>(0);
  const shouldAutoScroll = useRef<boolean>(true);

  // スクロールイベントハンドラー
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    // 上部に近いかどうかをチェック（過去のメッセージ読み込み用）
    const nearTop = scrollTop < 500;
    setIsNearTop(nearTop);

    // 上部にスクロールした時に過去のメッセージを読み込み
    if (nearTop && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }

    // スクロールトップボタンの表示判定
    const showButton = scrollTop > 1000;
    setShowScrollTop(showButton);

    // 自動スクロールの判定（下部付近でのみ自動スクロール）
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100;
    shouldAutoScroll.current = isAtBottom;

    lastScrollTop.current = scrollTop;
  }, [hasMore, isLoadingMore, onLoadMore]);

  // 新しいメッセージが追加された時の自動スクロール
  useEffect(() => {
    if (scrollRef.current && shouldAutoScroll.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // スクロールトップファンクション
  const scrollToTop = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // 最新メッセージにスクロール
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // ユーザーメッセージの数をカウント
  const userMessageCount = messages.filter(msg => msg.role === 'user').length;
  const shouldShowWelcome = userMessageCount === 0;

  // デバッグログ
  console.log('🔍 MessageList Debug:', {
    totalMessages: messages.length,
    userMessages: userMessageCount,
    character: character?.name,
    showWelcome: shouldShowWelcome
  });

  return (
    <div className="relative h-full">
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent relative z-20"
      >
        {/* 過去のメッセージ読み込みインジケーター */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="flex items-center space-x-2 text-gray-500 text-sm bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>過去のメッセージを読み込み中...</span>
            </div>
          </div>
        )}
        
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {shouldShowWelcome && (
          <div className="text-center py-12 bg-white/85 backdrop-blur-sm rounded-2xl mx-auto max-w-md shadow-lg border border-white/50 relative z-30">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <Image 
                src={character.imageChatAvatar || '/images/default-character.png'} 
                alt={character.name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {character.name}との会話を始めよう
            </h3>
            <p className="text-gray-600 text-sm">
              {character.description}
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageItem 
            key={message.id}
            message={message}
            character={character}
            showAdvanced={showAdvanced}
            affinityLevel={affinityLevel}
          />
        ))}

        {isLoading && (
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
              <Image 
                src={character.imageChatAvatar || '/images/default-character.png'} 
                alt={character.name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div 
                className="inline-block bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm px-3 sm:px-4 py-2 sm:py-3 shadow-sm border border-gray-200/30"
                style={{ borderLeftColor: character.themeColor }}
              >
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
      
      {/* スクロールトップボタン */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="absolute top-4 right-4 z-30 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-2 shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200"
          aria-label="トップにスクロール"
        >
          <ChevronUp className="w-5 h-5 text-gray-600" />
        </button>
      )}
    </div>
  );
}