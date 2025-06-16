'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
// import { useTranslations } from 'next-intl';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { getAuthHeaders, getCurrentUser, isDevelopment } from '@/utils/auth';
import { handleApiError } from '@/utils/errorHandler';
import { useToast } from '@/contexts/ToastContext';
import { validateMessageBeforeSend } from '@/utils/contentFilter';
import { ChatPaginationService, PaginationState } from '@/utils/chatPagination';
import { 
  Character, 
  UserCharacterAffinity, 
  TokenStatus, 
  Message, 
  ChatData, 
  LocalizedString,
  getLocalizedString 
} from '@/types/common';

// ChatLayoutで使用する文字列ベースのキャラクター型
interface ChatLayoutCharacter {
  _id: string;
  name: string; // 文字列に変換済み
  description: string; // 文字列に変換済み
  imageChatAvatar: string;
  imageChatBackground: string;
  currentMood: 'happy' | 'sad' | 'angry' | 'shy' | 'excited';
  themeColor: string;
}

interface ChatLayoutData {
  character: ChatLayoutCharacter;
  affinity: UserCharacterAffinity;
  tokenStatus: TokenStatus;
  messages: Message[];
}

export default function ChatPage() {
  const params = useParams();
  // const t = useTranslations('chat');
  const { handleApiError: showApiError, success } = useToast();
  const [chatData, setChatData] = useState<ChatLayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const characterId = params.id as string;
  const locale = params.locale as string;

  const loadChatData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      try {
        // 実際のAPI呼び出し
        const response = await fetch(`/api/chats/${characterId}?locale=${locale}`, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const apiData = await response.json();
        
        // API レスポンスを ChatLayoutData 形式に変換
        const chatData: ChatLayoutData = {
          character: {
            _id: apiData.character._id,
            name: getLocalizedString(apiData.character.name, locale),
            description: getLocalizedString(apiData.character.description, locale),
            imageChatAvatar: apiData.character.imageChatAvatar || '/characters/luna.png',
            imageChatBackground: apiData.character.imageChatBackground || apiData.character.imageChatAvatar || '/characters/luna.png',
            currentMood: apiData.userState?.affinity?.mood || 'neutral', // 統一: affinityのmoodを使用
            themeColor: apiData.character.themeColor || '#8B5CF6'
          },
          affinity: {
            level: apiData.userState?.affinity?.level || 0,
            currentExp: apiData.userState?.affinity?.experience || 0,
            nextLevelExp: 1000, // TODO: バックエンドから計算
            unlockedIllustrations: apiData.userState?.unlockedGalleryImages || [],
            currentMood: apiData.userState?.affinity?.mood || 'neutral'
          },
          tokenStatus: {
            tokensRemaining: apiData.userState?.tokenBalance || 0,
            lastMessageCost: 0 // 最後のメッセージコストは別途管理
          },
          messages: (apiData.chat?.messages || []).map((msg: any) => ({
            id: msg._id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            tokens: msg.tokensUsed
          }))
        };
        
        setChatData(chatData);
        return; // 実API成功時は早期リターン
        
      } catch (apiError) {
        console.error('API call failed, falling back to mock data:', apiError);
        
        // APIエラー時は開発環境でのみモックデータを使用
        if (!isDevelopment()) {
          throw apiError; // 本番環境ではエラーをそのまま投げる
        }

        // モックデータ（API失敗時のフォールバック）
        const getCharacterData = (id: string) => {
          switch (id) {
            case '1':
              return {
                name: 'ルナ',
                description: '明るく元気な女の子',
                imageChatAvatar: '/characters/00009-3823393646_cleanup.png',
                imageChatBackground: '/backgrounds/default.jpg',
                currentMood: 'happy' as const,
                themeColor: '#8B5CF6'
              };
            case '2':
              return {
                name: 'ミコ',
                description: '神秘的な巫女さん',
                imageChatAvatar: '/characters/00010-3296923052.png',
                imageChatBackground: '/backgrounds/default.jpg',
                currentMood: 'shy' as const,
                themeColor: '#EC4899'
              };
            case '3':
              return {
                name: 'ゼン',
                description: 'クールな武士',
                imageChatAvatar: '/characters/00012-2372329152.png',
                imageChatBackground: '/backgrounds/default.jpg',
                currentMood: 'excited' as const,
                themeColor: '#0EA5E9'
              };
            default:
              return {
                name: 'ルナ',
                description: '明るく元気な女の子',
                imageChatAvatar: '/characters/00009-3823393646_cleanup.png',
                imageChatBackground: '/backgrounds/default.jpg',
                currentMood: 'happy' as const,
                themeColor: '#8B5CF6'
              };
          }
        };

        const characterData = getCharacterData(characterId);

        // フォールバック用の基本データ（モックは削除済み）
        const fallbackData: ChatLayoutData = {
          character: {
            _id: characterId,
            ...characterData
          },
          affinity: {
            level: 0,
            currentExp: 0,
            nextLevelExp: 100,
            unlockedIllustrations: []
          },
          tokenStatus: {
            tokensRemaining: 0,
            lastMessageCost: 0
          },
          messages: []
        };
        
        setChatData(fallbackData);
      }
    } catch (err) {
      console.error('Chat data loading error:', err);
      setError('チャットデータの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [characterId, locale]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!chatData) return;

    // フロントエンド側でメッセージバリデーション
    const validation = validateMessageBeforeSend(message);
    if (!validation.canSend) {
      showApiError({
        code: 'CONTENT_VALIDATION_ERROR',
        message: validation.errorMessage || 'メッセージに問題があります'
      }, validation.errorMessage || 'メッセージの送信に失敗しました');
      return;
    }

    // ユーザーメッセージを即座に表示
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    try {

      setChatData(prev => prev ? {
        ...prev,
        messages: [...prev.messages, tempUserMessage]
      } : null);

      // API呼び出し
      const response = await fetch(`/api/chats/${characterId}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: message,
          sessionId: `session-${Date.now()}`
        })
      });

      if (!response.ok) {
        const apiError = await handleApiError(response);
        throw apiError;
      }

      const responseData = await response.json();

      // バックエンドの実際のレスポンス形式に合わせて処理
      if (responseData.userMessage && responseData.aiResponse) {
        const newUserMessage = {
          id: responseData.userMessage._id,
          role: 'user' as const,
          content: responseData.userMessage.content,
          timestamp: new Date(responseData.userMessage.timestamp),
          tokens: responseData.userMessage.tokensUsed
        };
        
        const newAiMessage = {
          id: responseData.aiResponse._id,
          role: 'assistant' as const,
          content: responseData.aiResponse.content,
          timestamp: new Date(responseData.aiResponse.timestamp),
          tokens: responseData.aiResponse.tokensUsed
        };
        
        setChatData(prev => prev ? {
          ...prev,
          messages: [
            ...prev.messages.filter(m => m.id !== tempUserMessage.id),
            newUserMessage,
            newAiMessage
          ],
          tokenStatus: {
            ...prev.tokenStatus,
            tokensRemaining: responseData.tokenBalance || prev.tokenStatus.tokensRemaining,
            lastMessageCost: responseData.aiResponse.tokensUsed || 0
          },
          affinity: {
            ...prev.affinity,
            level: responseData.affinity?.level || prev.affinity.level,
            currentExp: responseData.affinity?.increase 
              ? prev.affinity.currentExp + responseData.affinity.increase 
              : prev.affinity.currentExp
          }
        } : null);
      }

    } catch (error) {
      
      setChatData(prev => prev ? {
        ...prev,
        messages: prev.messages.filter(m => m.id !== tempUserMessage.id)
      } : null);

      
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const apiError = error as any;
        // 禁止用語エラーの場合は専用メッセージを表示
        if (apiError.code === 'CONTENT_VIOLATION') {
          showApiError(apiError, apiError.message || 'メッセージが利用規約に違反しています');
        } else {
          showApiError(apiError, 'メッセージの送信に失敗しました');
        }
      } else {
        showApiError({
          code: 'MESSAGE_SEND_ERROR',
          message: error instanceof Error ? error.message : '予期しないエラーが発生しました'
        }, 'メッセージの送信に失敗しました');
      }
    }
  }, [chatData?.character?._id, characterId, showApiError]); // chatDataの特定フィールドのみを依存関係にして適切な更新を実現

  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

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
      onSendMessage={handleSendMessage}
      onTokenPurchaseSuccess={loadChatData}
    />
  );
}