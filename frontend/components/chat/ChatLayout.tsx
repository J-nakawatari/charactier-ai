'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Send, Heart, Zap } from 'lucide-react';
import { MessageList } from './MessageList';
import { AffinityBar } from './AffinityBar';
import { MoodVisualizer } from './MoodVisualizer';
import { TokenBar } from './TokenBar';
import { UnlockPopup } from './UnlockPopup';
import { TokenPurchaseModal } from './TokenPurchaseModal';
import ChatSidebar from './ChatSidebar';
import { TypingIndicator } from './TypingIndicator';
import { ConnectionIndicator } from './ConnectionIndicator';
import { useRealtimeChat, useTypingDebounce, useChatConnectionStatus } from '@/hooks/useRealtimeChat';

interface Character {
  _id: string;
  name: string;
  description: string;
  imageChatAvatar: string;
  imageChatBackground: string;
  currentMood: 'happy' | 'sad' | 'angry' | 'shy' | 'excited';
  themeColor: string;
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
}

export function ChatLayout({ 
  character, 
  affinity, 
  tokenStatus, 
  messages, 
  onSendMessage,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}: ChatLayoutProps) {
  const [inputMessage, setInputMessage] = useState('');
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

  // 定期的にトークン残高を更新する関数
  const refreshTokenBalance = async () => {
    try {
      // TODO: 適切なユーザー情報取得APIに変更
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const userData = await response.json();
        setCurrentTokens(userData.tokenBalance || userData.user?.tokenBalance || currentTokens);
      }
    } catch (error) {
      console.error('Token balance refresh failed:', error);
    }
  };

  // ページがフォーカスされた時（購入完了から戻ってきた時など）にトークン残高を更新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshTokenBalance();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 定期的な更新（30秒間隔）
    const interval = setInterval(refreshTokenBalance, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    setInputMessage('');
    setIsLoading(true);

    try {
      // 親コンポーネントのonSendMessage関数を呼び出し
      // メッセージの更新は親コンポーネントで管理される
      const messageToSend = inputMessage.trim();
      setInputMessage('');
      
      // タイピング停止とキャラクタータイピング開始
      stopTyping();
      realtimeChat.setCharacterTyping(true);
      
      await onSendMessage(messageToSend);

      // レベルアップ演出のトリガー（テスト用）
      if (Math.random() > 0.8) {
        setUnlockData({ level: affinity.level + 1, illustration: 'new_smile' });
        setShowUnlockPopup(true);
      }

    } catch (error) {
      console.error('Message send error:', error);
    } finally {
      setIsLoading(false);
      realtimeChat.setCharacterTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // シフト+エンターの場合は何もしない（デフォルトの改行）
  };

  return (
    <div className="flex h-screen">
      {/* サイドバー */}
      <ChatSidebar />
      
      {/* メインチャットエリア */}
      <div 
        className="flex-1 flex flex-col relative lg:ml-64"
        style={{
          backgroundImage: character.imageChatBackground 
            ? `url(${character.imageChatBackground})` 
            : 'linear-gradient(to bottom right, #faf5ff, #f3e8ff, #ddd6fe)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* 背景オーバーレイ */}
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
      
      {/* ヘッダー */}
      <header className="relative z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200/50 p-3 sm:p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="hidden sm:block w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
              <Image 
                src={character.imageChatAvatar} 
                alt={character.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-semibold text-gray-900 text-base">{character.name}</h1>
            </div>
          </div>

          <TokenBar 
            lastMessageCost={tokenStatus.lastMessageCost}
            onPurchaseClick={() => setShowPurchaseModal(true)}
            onTokenUpdate={(newTokens) => setCurrentTokens(newTokens)}
          />
        </div>
      </header>

      {/* 親密度バー */}
      <div className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <AffinityBar 
            level={affinity.level}
            currentExp={affinity.currentExp}
            nextLevelExp={affinity.nextLevelExp}
            themeColor={character.themeColor}
            mood={character.currentMood}
            characterId={character._id}
            onAffinityUpdate={(newAffinity) => {
              console.log('Affinity updated:', newAffinity);
            }}
          />
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 relative z-10 overflow-hidden">
        {/* キャラクター画像（真ん中に配置） */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-full w-auto">
            <Image 
              src={character.imageChatAvatar}
              alt={character.name}
              width={400}
              height={600}
              className="h-full w-auto object-contain"
            />
          </div>
        </div>
        
        <MessageList 
          messages={localMessages}
          character={character}
          isLoading={isLoading}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
        />
      </div>

      {/* 入力エリア */}
      <div className="relative z-10 bg-white/90 backdrop-blur-sm border-t border-gray-200/50 p-3 sm:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`${character.name}にメッセージを送る...`}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 focus:outline-none focus:border-[#ec4899] bg-white text-gray-900 placeholder-gray-500 text-sm sm:text-base min-h-[40px] sm:min-h-[48px]"
                rows={1}
                style={{ maxHeight: '80px' }}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                ~{tokenStatus.lastMessageCost}枚
              </div>
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-3 sm:px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg min-h-[40px] sm:min-h-[48px]"
              style={{ backgroundColor: character.themeColor }}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
          
          {/* 改行説明テキスト */}
          <span className="block text-center text-xs text-gray-400 m-0" style={{ lineHeight: 0, marginTop: '4px' }}>Shift+エンターで改行できます</span>
        </div>
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
          }}
        />
      </div>
    </div>
  );
}