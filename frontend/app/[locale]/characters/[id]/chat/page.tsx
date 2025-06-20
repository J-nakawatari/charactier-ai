'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { getAuthHeaders, getCurrentUser, isDevelopment } from '@/utils/auth';
import { handleApiError, formatViolationMessage, getSanctionSeverity } from '@/utils/errorHandler';
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
  // 🤖 AIモデル情報
  aiModel?: string;
  model?: string;
  // 💬 プロンプト情報
  personalityPrompt?: string;
  adminPrompt?: string;
}

interface ChatLayoutData {
  character: ChatLayoutCharacter;
  affinity: UserCharacterAffinity;
  tokenStatus: TokenStatus;
  messages: Message[];
}

export default function ChatPage() {
  const params = useParams();
  const t = useTranslations('errors');
  const tChat = useTranslations('chat');
  const { handleApiError: showApiError, success, error: showError, warning: showWarning } = useToast();
  const [chatData, setChatData] = useState<ChatLayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>({ tokensRemaining: 0, lastMessageCost: 0 });
  const [affinity, setAffinity] = useState<UserCharacterAffinity>({ level: 0, currentExp: 0, nextLevelExp: 100, unlockedIllustrations: [] });

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
            themeColor: apiData.character.themeColor || '#8B5CF6',
            // 🤖 AIモデル情報を追加
            aiModel: apiData.character.aiModel,
            model: apiData.character.model,
            // 💬 プロンプト情報を追加
            personalityPrompt: getLocalizedString(apiData.character.personalityPrompt, locale),
            adminPrompt: getLocalizedString(apiData.character.adminPrompt, locale)
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
            lastMessageCost: (() => {
              // 最新のAIメッセージからトークン消費数を取得
              const messages = apiData.chat?.messages || [];
              const lastAiMessage = [...messages].reverse().find((msg: any) => msg.role === 'assistant');
              return lastAiMessage?.tokensUsed || 0;
            })()
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
        setMessages(chatData.messages);
        setTokenStatus(chatData.tokenStatus);
        setAffinity(chatData.affinity);
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
        setMessages(fallbackData.messages);
        setTokenStatus(fallbackData.tokenStatus);
        setAffinity(fallbackData.affinity);
      }
    } catch (err) {
      console.error('Chat data loading error:', err);
      setError(t('errors.chatLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [characterId, locale, t]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!chatData) return;

    // フロントエンド側でメッセージバリデーション
    const validation = validateMessageBeforeSend(message);
    // バックエンドの制裁システムをテストするため一時的に無効化
    // if (!validation.canSend) {
    //   showApiError({
    //     code: 'CONTENT_VALIDATION_ERROR',
    //     message: validation.errorMessage || 'メッセージに問題があります'
    //   }, validation.errorMessage || 'メッセージの送信に失敗しました');
    //   return;
    // }

    // ユーザーメッセージを即座に表示
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    try {

      // メッセージだけを更新（他のプロパティは更新しない）
      setMessages(prev => [...prev, tempUserMessage]);

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
        
        // トークン不足エラーの場合は購入モーダルを表示
        if (apiError.code === 'INSUFFICIENT_TOKENS' || response.status === 402) {
          // トークン購入モーダルを表示するイベントを発火
          const tokenPurchaseEvent = new CustomEvent('showTokenPurchaseModal', {
            detail: { reason: 'insufficient_tokens' }
          });
          window.dispatchEvent(tokenPurchaseEvent);
          // トークン不足の場合はトーストを表示しない
          return;
        }
        
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
        
        // 各状態を個別に更新
        setMessages(prev => [
          ...prev.filter(m => m.id !== tempUserMessage.id),
          newUserMessage,
          newAiMessage
        ]);
        
        setTokenStatus(prev => ({
          ...prev,
          tokensRemaining: responseData.tokenBalance || prev.tokensRemaining,
          lastMessageCost: responseData.aiResponse.tokensUsed || 0
        }));
        
        setAffinity(prev => ({
          ...prev,
          level: responseData.affinity?.level || prev.level,
          currentExp: responseData.affinity?.increase 
            ? prev.currentExp + responseData.affinity.increase 
            : prev.currentExp
        }));

        // レベルアップ情報の処理
        if (responseData.levelUp) {
          // レベルアップポップアップの表示トリガーをChatLayoutに送信するためのイベントを発火
          const levelUpEvent = new CustomEvent('levelUp', {
            detail: {
              level: responseData.levelUp.newLevel,
              illustration: responseData.levelUp.unlockReward,
              characterName: chatData?.character.name || 'キャラクター'
            }
          });
          window.dispatchEvent(levelUpEvent);
        }
      }

    } catch (error) {
      
      // エラー時は一時メッセージを削除
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));

      
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const apiError = error as any;
        
        // トークン不足エラーは既にモーダル表示されるのでスキップ
        if (apiError.code === 'INSUFFICIENT_TOKENS') {
          return;
        }
        
        // 禁止用語エラーの場合は制裁情報を含む専用メッセージを表示
        if (apiError.code === 'CONTENT_VIOLATION') {
          const violationMessage = formatViolationMessage(apiError);
          const severity = getSanctionSeverity(apiError);
          
          
          // 制裁レベルに応じてトーストの種類を変更
          if (severity === 'critical') {
            showError('重大な違反', violationMessage);
          } else if (severity === 'high') {
            showWarning('警告', violationMessage);
          } else {
            showApiError(apiError, violationMessage);
          }
          
          // チャット停止またはアカウント停止の場合は追加の処理
          if (apiError.sanctionAction === 'chat_suspension' || 
              apiError.sanctionAction === 'account_suspension' || 
              apiError.sanctionAction === 'ban') {
            // チャット機能を無効化するロジックを後で実装
            console.log('Chat suspended due to violation:', apiError);
          }
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
  }, [chatData, messages, tokenStatus, affinity, showError, showWarning, showApiError, characterId]);

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
            {error || t('notFound')}
          </h2>
          <button 
            onClick={loadChatData}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {tChat('retry')}
          </button>
        </div>
      </div>
    );
  }



  return (
    <ChatLayout
      character={chatData.character}
      affinity={affinity}
      tokenStatus={tokenStatus}
      messages={messages}
      onSendMessage={handleSendMessage}
      onTokenPurchaseSuccess={loadChatData}
    />
  );
}