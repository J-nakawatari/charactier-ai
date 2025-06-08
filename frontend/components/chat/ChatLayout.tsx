'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Send, Heart, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MessageList } from './MessageList';
import { AffinityBar } from './AffinityBar';
import { MoodVisualizer } from './MoodVisualizer';
import { TokenBar } from './TokenBar';
import { UnlockPopup } from './UnlockPopup';

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
}

export function ChatLayout({ 
  character, 
  affinity, 
  tokenStatus, 
  messages, 
  onSendMessage 
}: ChatLayoutProps) {
  const router = useRouter();
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>(messages);
  const [showUnlockPopup, setShowUnlockPopup] = useState(false);
  const [unlockData, setUnlockData] = useState<{ level: number; illustration: string } | null>(null);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setLocalMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      await onSendMessage(userMessage.content);
      
      // モック AI レスポンス（実際のAPIレスポンスに置き換える）
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `${userMessage.content}について考えてみますね。とても興味深いお話ですね！`,
        timestamp: new Date(),
        tokens: 180
      };

      setLocalMessages(prev => [...prev, aiResponse]);

      // レベルアップ演出のトリガー（テスト用）
      if (Math.random() > 0.8) {
        setUnlockData({ level: affinity.level + 1, illustration: 'new_smile' });
        setShowUnlockPopup(true);
      }

    } catch (error) {
      console.error('Message send error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div 
      className={`flex flex-col h-screen relative ${
        character.imageChatBackground 
          ? '' 
          : 'bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50'
      }`}
      style={character.imageChatBackground ? {
        backgroundImage: `url(${character.imageChatBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : {}}
    >
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
      
      {/* ヘッダー */}
      <header className="relative z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200/50 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors rounded-lg hover:bg-white/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                <img 
                  src={character.imageChatAvatar} 
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">{character.name}</h1>
                <MoodVisualizer mood={character.currentMood} />
              </div>
            </div>
          </div>

          <TokenBar 
            tokensRemaining={tokenStatus.tokensRemaining}
            lastMessageCost={tokenStatus.lastMessageCost}
          />
        </div>
      </header>

      {/* 親密度バー */}
      <div className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <AffinityBar 
            level={affinity.level}
            currentExp={affinity.currentExp}
            nextLevelExp={affinity.nextLevelExp}
            themeColor={character.themeColor}
          />
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 relative z-10 overflow-hidden">
        <MessageList 
          messages={localMessages}
          character={character}
          isLoading={isLoading}
        />
      </div>

      {/* 入力エリア */}
      <div className="relative z-10 bg-white/90 backdrop-blur-sm border-t border-gray-200/50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`${character.name}にメッセージを送る...`}
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors bg-white/80 backdrop-blur-sm"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                ~{tokenStatus.lastMessageCost}枚
              </div>
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
              style={{ backgroundColor: character.themeColor }}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
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
    </div>
  );
}