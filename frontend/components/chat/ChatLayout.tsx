'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Send, Heart, Zap, Settings, Eye, EyeOff } from 'lucide-react';
import { MessageList } from './MessageList';
import { AffinityBar } from './AffinityBar';
import { MoodVisualizer } from './MoodVisualizer';
import { TokenBar } from './TokenBar';
import { UnlockPopup } from './UnlockPopup';
import { TokenPurchaseModal } from './TokenPurchaseModal';
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

export function ChatLayout({ 
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
  const [showAdvanced, setShowAdvanced] = useState(false); // 🎯 高度機能表示切り替え
  const refreshTokenBalanceRef = useRef<() => Promise<void>>();
  
  // 🎭 親密度ストアの初期化
  const { updateAffinity } = useAffinityStore();
  
  // 🎨 感情に基づく背景スタイル
  const currentMood = (affinity as any).currentMood || 'neutral';
  const moodGradient = getMoodBackgroundGradient(currentMood);
  
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

  // 🎭 初期データでAffinityStoreを更新
  useEffect(() => {
    updateAffinity({
      level: affinity.level,
      experience: affinity.currentExp,
      mood: (affinity as any).currentMood || 'neutral'
    });
  }, [affinity, updateAffinity]);

  // 🖼️ キャラクター画像データのデバッグログ
  useEffect(() => {
    console.log('🔍 ChatLayout キャラクター画像データ:', {
      characterId: character._id,
      name: character.name,
      imageCharacterSelect: character.imageCharacterSelect,
      imageDashboard: character.imageDashboard,
      imageChatBackground: character.imageChatBackground,
      imageChatAvatar: character.imageChatAvatar,
      actualDisplayImage: character.imageChatBackground || character.imageChatAvatar || character.imageCharacterSelect
    });
  }, [character]);

  // 🔍 チャット画面の完全な状態デバッグログ
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 チャット画面 - 完全な状態確認');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 1. キャラクター基本情報
    console.log('👤 キャラクター情報:', {
      id: character._id,
      name: character.name,
      description: character.description,
      currentMood: character.currentMood,
      themeColor: character.themeColor,
      images: {
        avatar: character.imageChatAvatar,
        background: character.imageChatBackground
      }
    });
    
    // 2. AIモデルとプロンプト
    const currentModel = character.aiModel || character.model;
    console.log('🤖 AI設定:', {
      model: currentModel || 'undefined',
      aiModel: character.aiModel,
      personalityPrompt: character.personalityPrompt ? '✅ 設定済み（' + character.personalityPrompt.length + '文字）' : '❌ 未設定',
      adminPrompt: character.adminPrompt ? '✅ 設定済み（' + character.adminPrompt.length + '文字）' : '❌ 未設定'
    });
    
    // 3. トークン情報
    console.log('💰 トークン状態:', {
      残高: tokenStatus.tokensRemaining,
      最終メッセージコスト: tokenStatus.lastMessageCost,
      残高十分: tokenStatus.tokensRemaining > 0 ? '✅' : '❌'
    });
    
    // 4. 親密度情報
    console.log('❤️ 親密度情報:', {
      レベル: affinity.level,
      現在経験値: affinity.currentExp,
      次レベル必要経験値: affinity.nextLevelExp,
      進捗率: Math.round((affinity.currentExp / affinity.nextLevelExp) * 100) + '%',
      解放済みイラスト数: affinity.unlockedIllustrations?.length || 0,
      現在の気分: (affinity as any).currentMood || 'unknown'
    });
    
    // 5. メッセージ履歴
    console.log('💬 メッセージ履歴:', {
      総メッセージ数: messages.length,
      ユーザーメッセージ数: messages.filter(m => m.role === 'user').length,
      AIメッセージ数: messages.filter(m => m.role === 'assistant').length,
      最新メッセージ: messages.length > 0 ? {
        role: messages[messages.length - 1].role,
        content: messages[messages.length - 1].content.substring(0, 50) + '...',
        timestamp: messages[messages.length - 1].timestamp
      } : 'なし'
    });
    
    // 6. 接続状態
    console.log('🌐 接続状態:', {
      リアルタイム接続: connectionStatus,
      WebSocket: realtimeChat ? '✅ 接続中' : '❌ 未接続'
    });
    
    // 7. 認証情報（APIトークン）
    const authHeaders = getAuthHeaders() as Record<string, string>;
    console.log('🔐 認証状態:', {
      認証ヘッダー存在: authHeaders.Authorization ? '✅' : '❌',
      トークンタイプ: authHeaders.Authorization ? authHeaders.Authorization.split(' ')[0] : 'なし'
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('タイムスタンプ:', new Date().toLocaleString('ja-JP'));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  }, [character, affinity, tokenStatus, messages, connectionStatus, realtimeChat]);

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

  // ページがフォーカスされた時（購入完了から戻ってきた時など）にトークン残高を更新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && refreshTokenBalanceRef.current) {
        refreshTokenBalanceRef.current();
      }
    };

    const intervalHandler = () => {
      if (refreshTokenBalanceRef.current) {
        refreshTokenBalanceRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 定期的な更新（30秒間隔）
    const interval = setInterval(intervalHandler, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []); // 依存関係を削除してrefパターンを使用

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    setInputMessage('');
    setIsLoading(true);

    try {
      // 親コンポーネントのonSendMessage関数を呼び出し
      // メッセージの更新は親コンポーネントで管理される
      const messageToSend = inputMessage.trim();
      setInputMessage('');
      
      // 📤 メッセージ送信時の完全な状態ログ
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📤 メッセージ送信時の状態');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const currentModel = character.aiModel || character.model;
      console.log('🤖 使用AIモデル:', currentModel || 'undefined');
      console.log('💬 送信メッセージ:', messageToSend);
      console.log('💰 現在のトークン残高:', tokenStatus.tokensRemaining);
      console.log('❤️ 現在の親密度レベル:', affinity.level);
      console.log('😊 現在の気分:', character.currentMood);
      console.log('🔐 認証状態:', (getAuthHeaders() as Record<string, string>).Authorization ? '✅ 認証済み' : '❌ 未認証');
      
      // 禁止用語チェック（フロントエンド側）
      const validation = validateMessageBeforeSend(messageToSend);
      console.log('🚫 禁止用語チェック:', {
        canSend: validation.canSend ? '✅ 送信可能' : '❌ 送信不可',
        errorMessage: validation.errorMessage || 'なし'
      });
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('送信時刻:', new Date().toLocaleString('ja-JP'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // タイピング停止とキャラクタータイピング開始
      stopTyping();
      realtimeChat.setCharacterTyping(true);
      
      await onSendMessage(messageToSend);
      
      // 📥 メッセージ送信後の状態ログ
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📥 メッセージ送信完了後の状態');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ 送信成功');
      console.log('💰 更新後のトークン残高:', tokenStatus.tokensRemaining);
      console.log('💸 消費トークン数:', tokenStatus.lastMessageCost);
      console.log('❤️ 更新後の親密度:', affinity.level);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // レベルアップ演出のトリガー（テスト用）
      if (Math.random() > 0.8) {
        setUnlockData({ level: affinity.level + 1, illustration: 'new_smile' });
        setShowUnlockPopup(true);
      }

    } catch (error) {
      // ❌ エラー時の詳細ログ
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ メッセージ送信エラー');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('エラー詳細:', error);
      console.log('エラー種別:', error instanceof Error ? error.name : typeof error);
      console.log('エラーメッセージ:', error instanceof Error ? error.message : String(error));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="hidden sm:block w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
              <Image 
                src={getSafeImageUrl(character.imageChatAvatar || character.imageCharacterSelect, character.name)} 
                alt={character.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                style={{ backgroundColor: 'transparent' }}
                unoptimized={true}
                onError={(e) => {
                  console.error('🖼️ ChatLayout Avatar画像読み込みエラー:', {
                    imageChatAvatar: character.imageChatAvatar,
                    imageCharacterSelect: character.imageCharacterSelect,
                    characterId: character._id,
                    finalSrc: getSafeImageUrl(character.imageChatAvatar || character.imageCharacterSelect, character.name)
                  });
                }}
              />
            </div>
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

          <div className="flex items-center space-x-2">
            {/* 🎯 高度機能表示切り替え */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-2 rounded-lg transition-colors ${
                showAdvanced 
                  ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
              title={showAdvanced ? '高度表示オフ' : '高度表示オン'}
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
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ backgroundColor: 'transparent' }}>
          <div className="h-full w-auto" style={{ backgroundColor: 'transparent' }}>
            <img 
              src={getSafeImageUrl(character.imageChatBackground || character.imageChatAvatar || character.imageCharacterSelect, character.name)}
              alt={character.name}
              className="h-full w-auto object-contain bg-transparent"
              style={{ 
                backgroundColor: 'transparent',
                imageRendering: 'auto',
                mixBlendMode: 'normal'
              }}
              onError={(e) => {
                console.error('🖼️ ChatLayout 背景画像読み込みエラー:', {
                  imageChatBackground: character.imageChatBackground,
                  imageChatAvatar: character.imageChatAvatar,
                  imageCharacterSelect: character.imageCharacterSelect,
                  characterId: character._id,
                  finalSrc: getSafeImageUrl(character.imageChatBackground || character.imageChatAvatar || character.imageCharacterSelect, character.name)
                });
              }}
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
          showAdvanced={showAdvanced}
          affinityLevel={affinity.level}
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
            // チャットデータを再読み込み
            if (onTokenPurchaseSuccess) {
              onTokenPurchaseSuccess();
            }
          }}
        />
      </div>
    </div>
  );
}