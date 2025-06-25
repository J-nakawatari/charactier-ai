'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getAuthHeaders } from '@/utils/auth';
import { 
  MessageSquare, 
  Database, 
  Cpu, 
  HardDrive, 
  CheckCircle, 
  XCircle,
  Info,
  AlertCircle,
  RefreshCw,
  Brain
} from 'lucide-react';

interface ChatDiagnostics {
  character: {
    id: string;
    name: { ja: string; en: string };
    aiModel: string;
    isActive: boolean;
    updatedAt: string;
  };
  chat: {
    exists: boolean;
    messageCount: number;
    totalTokensUsed: number;
    lastActivity: string;
    createdAt: string;
    recentMessages: Array<{
      role: string;
      timestamp: string;
      tokensUsed: number;
      contentPreview: string;
    }>;
    conversationHistory?: {
      description: string;
      sentToAI: Array<{
        role: string;
        content: string;
        originalLength: number;
        timestamp: string;
      }>;
      totalMessagesInDB: number;
      messagesUsedForContext: number;
      contextWindowSize: string;
      truncationLimit: string;
    };
  };
  cache: {
    enabled: boolean;
    exists: boolean;
    data: any;
  };
  tokenUsage: {
    lastUsed: string;
    tokensUsed: number;
    aiModel: string;
    cacheHit: boolean;
    apiCost: number;
  } | null;
  prompt: {
    personalityPrompt: { ja: string; en: string } | null;
    characterInfo: {
      age: string;
      occupation: string;
      personalityPreset: string;
      personalityTags: string[];
    };
    promptLength: {
      personality: { ja: number; en: number };
    };
  };
  system: {
    mongoConnected: boolean;
    redisConnected: boolean;
    currentModel: string;
  };
}

export default function ChatDiagnosticsPage() {
  const params = useParams();
  const characterId = params.characterId as string;
  const [diagnostics, setDiagnostics] = useState<ChatDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/v1/debug/chat-diagnostics/${characterId}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`診断データの取得に失敗しました: ${response.status}`);
      }
      
      const data = await response.json();
      setDiagnostics(data.diagnostics);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    fetchDiagnostics();
  }, [characterId, fetchDiagnostics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !diagnostics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error || '診断データが見つかりません'}</p>
          <button 
            onClick={fetchDiagnostics}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  const StatusIcon = ({ status }: { status: boolean }) => 
    status ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">チャットシステム診断</h1>
        <button 
          onClick={fetchDiagnostics}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <RefreshCw className="w-4 h-4" />
          更新
        </button>
      </div>

      {/* システムステータス */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
          <Cpu className="w-5 h-5" />
          システムステータス
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <StatusIcon status={diagnostics.system.mongoConnected} />
            <span className="text-gray-700">MongoDB接続</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon status={diagnostics.system.redisConnected} />
            <span className="text-gray-700">Redis接続</span>
          </div>
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            <span className="text-gray-700">使用モデル: {diagnostics.system.currentModel}</span>
          </div>
        </div>
      </div>

      {/* キャラクター情報 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">キャラクター情報</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">名前</p>
            <p className="font-medium text-gray-900">{diagnostics.character.name.ja} / {diagnostics.character.name.en}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">AIモデル</p>
            <p className="font-medium text-gray-900">{diagnostics.character.aiModel}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">ステータス</p>
            <p className="font-medium flex items-center gap-2 text-gray-900">
              <StatusIcon status={diagnostics.character.isActive} />
              {diagnostics.character.isActive ? 'アクティブ' : '非アクティブ'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">最終更新</p>
            <p className="font-medium text-gray-900">{new Date(diagnostics.character.updatedAt).toLocaleString('ja-JP')}</p>
          </div>
        </div>
      </div>

      {/* チャット履歴 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
          <MessageSquare className="w-5 h-5" />
          チャット履歴
        </h2>
        {diagnostics.chat.exists ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">総メッセージ数</p>
                <p className="font-medium">{diagnostics.chat.messageCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">総トークン使用量</p>
                <p className="font-medium">{diagnostics.chat.totalTokensUsed.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">最終活動</p>
                <p className="font-medium">{new Date(diagnostics.chat.lastActivity).toLocaleString('ja-JP')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">作成日時</p>
                <p className="font-medium">{new Date(diagnostics.chat.createdAt).toLocaleString('ja-JP')}</p>
              </div>
            </div>
            {diagnostics.chat.recentMessages.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">最近のメッセージ</h3>
                <div className="space-y-2">
                  {diagnostics.chat.recentMessages.map((msg, idx) => (
                    <div key={idx} className="border-l-2 border-gray-200 pl-3 py-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`font-medium ${msg.role === 'user' ? 'text-blue-600' : 'text-green-600'}`}>
                          {msg.role === 'user' ? 'ユーザー' : 'AI'}
                        </span>
                        <span className="text-gray-500">
                          {new Date(msg.timestamp).toLocaleString('ja-JP')}
                        </span>
                        <span className="text-gray-500">
                          ({msg.tokensUsed}トークン)
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{msg.contentPreview}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500">チャット履歴がありません</p>
        )}
      </div>

      {/* AI記憶システム（会話コンテキスト） */}
      {diagnostics.chat.conversationHistory && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <Brain className="w-5 h-5" />
            AI記憶システム
          </h2>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">{diagnostics.chat.conversationHistory.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-600">データベース内の総メッセージ数:</span>
                <span className="ml-2 font-medium text-blue-900">{diagnostics.chat.conversationHistory.totalMessagesInDB}</span>
              </div>
              <div>
                <span className="text-blue-600">AIに送信されるメッセージ数:</span>
                <span className="ml-2 font-medium text-blue-900">{diagnostics.chat.conversationHistory.messagesUsedForContext}</span>
              </div>
              <div>
                <span className="text-blue-600">コンテキストウィンドウ:</span>
                <span className="ml-2 font-medium text-blue-900">{diagnostics.chat.conversationHistory.contextWindowSize}</span>
              </div>
              <div>
                <span className="text-blue-600">文字数制限:</span>
                <span className="ml-2 font-medium text-blue-900">{diagnostics.chat.conversationHistory.truncationLimit}</span>
              </div>
            </div>
          </div>
          {diagnostics.chat.conversationHistory.sentToAI.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-800">AIに送信される会話履歴</h3>
              <div className="space-y-2">
                {diagnostics.chat.conversationHistory.sentToAI.map((msg, idx) => (
                  <div key={idx} className="border-l-2 border-purple-200 pl-3 py-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`font-medium ${msg.role === 'user' ? 'text-blue-600' : 'text-green-600'}`}>
                        {msg.role === 'user' ? 'ユーザー' : 'AI'}
                      </span>
                      <span className="text-gray-500">
                        {new Date(msg.timestamp).toLocaleString('ja-JP')}
                      </span>
                      {msg.originalLength > 120 && (
                        <span className="text-xs text-orange-600">
                          (元: {msg.originalLength}文字 → 120文字に短縮)
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{msg.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">AIに送信される会話履歴がありません</p>
          )}
        </div>
      )}

      {/* キャッシュ状態 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
          <HardDrive className="w-5 h-5" />
          プロンプトキャッシュ
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <StatusIcon status={diagnostics.cache.enabled} />
            <span>キャッシュ有効</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon status={diagnostics.cache.exists} />
            <span>キャッシュ存在</span>
          </div>
        </div>
        {diagnostics.cache.data && (
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <p className="text-gray-600">キャッシュキー: character_prompt:{characterId}</p>
          </div>
        )}
      </div>

      {/* プロンプト情報 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
          <Database className="w-5 h-5" />
          プロンプト情報
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-800">キャラクター基本情報</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-600">年齢</p>
                <p className="font-medium text-gray-900">{diagnostics.prompt.characterInfo.age}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">職業</p>
                <p className="font-medium text-gray-900">{diagnostics.prompt.characterInfo.occupation}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">性格プリセット</p>
                <p className="font-medium text-gray-900">{diagnostics.prompt.characterInfo.personalityPreset}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">性格タグ</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {diagnostics.prompt.characterInfo.personalityTags.length > 0 ? (
                    diagnostics.prompt.characterInfo.personalityTags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">タグなし</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-800">性格プロンプト</h3>
            {diagnostics.prompt.personalityPrompt ? (
              <div className="space-y-2">
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600 mb-1">日本語 ({diagnostics.prompt.promptLength.personality.ja}文字)</p>
                  <p className="text-sm text-gray-700">{diagnostics.prompt.personalityPrompt.ja}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600 mb-1">英語 ({diagnostics.prompt.promptLength.personality.en}文字)</p>
                  <p className="text-sm text-gray-700">{diagnostics.prompt.personalityPrompt.en}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">性格プロンプトが設定されていません（デフォルトプロンプトが使用されます）</p>
            )}
          </div>
        </div>
      </div>

      {/* 最新のトークン使用状況 */}
      {diagnostics.tokenUsage && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">最新のトークン使用状況</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">最終使用日時</p>
              <p className="font-medium text-gray-900">{new Date(diagnostics.tokenUsage.lastUsed).toLocaleString('ja-JP')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">使用トークン数</p>
              <p className="font-medium text-gray-900">{diagnostics.tokenUsage.tokensUsed}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">使用モデル</p>
              <p className="font-medium text-gray-900">{diagnostics.tokenUsage.aiModel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">キャッシュヒット</p>
              <p className="font-medium flex items-center gap-2 text-gray-900">
                <StatusIcon status={diagnostics.tokenUsage.cacheHit} />
                {diagnostics.tokenUsage.cacheHit ? 'あり' : 'なし'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">API費用</p>
              <p className="font-medium text-gray-900">${diagnostics.tokenUsage.apiCost.toFixed(4)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}