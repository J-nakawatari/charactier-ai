'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
// import { useTranslations } from 'next-intl';
import { ChatLayout } from '@/components/chat/ChatLayout';

// モックデータ型定義
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

interface ChatData {
  character: Character;
  affinity: UserCharacterAffinity;
  tokenStatus: TokenStatus;
  messages: Message[];
}

export default function ChatPage() {
  const params = useParams();
  // const t = useTranslations('chat');
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const characterId = params.id as string;
  const locale = params.locale as string;

  useEffect(() => {
    loadChatData();
  }, [characterId, locale]);

  const loadChatData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: 実際のAPI呼び出しに置き換える
      // const response = await fetch(`/api/chat/${characterId}?locale=${locale}`);
      // const data = await response.json();

      // モックデータ（仮）
      const mockData: ChatData = {
        character: {
          _id: characterId,
          name: characterId === '1' ? 'ルナ' : characterId === '2' ? 'ミコ' : 'ゼン',
          description: '明るく元気な女の子',
          imageChatAvatar: `/characters/${characterId === '1' ? 'luna' : characterId === '2' ? 'miko' : 'zen'}.png`,
          imageChatBackground: '',
          currentMood: 'happy',
          themeColor: '#8B5CF6'
        },
        affinity: {
          level: 12,
          currentExp: 385,
          nextLevelExp: 500,
          unlockedIllustrations: ['basic_smile', 'wink', 'happy']
        },
        tokenStatus: {
          tokensRemaining: 2500,
          lastMessageCost: 200
        },
        messages: [
          {
            id: '1',
            role: 'assistant',
            content: 'こんにちは！今日はどんなお話をしましょうか？',
            timestamp: new Date(Date.now() - 60000)
          }
        ]
      };

      // API遅延をシミュレート
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setChatData(mockData);
    } catch (err) {
      console.error('Chat data loading error:', err);
      setError('チャットデータの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !chatData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'チャットデータが見つかりません'}
          </h2>
          <button 
            onClick={loadChatData}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChatLayout
      character={chatData.character}
      affinity={chatData.affinity}
      tokenStatus={chatData.tokenStatus}
      messages={chatData.messages}
      onSendMessage={async (message: string) => {
        // TODO: メッセージ送信処理の実装
        console.log('Sending message:', message);
      }}
    />
  );
}