'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch } from '@/utils/admin-api';
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
  Brain,
  ArrowLeft,
  Users
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
    conversationHistory: {
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
    data: {
      useCount: number;
      lastUsed: string;
      ttl: string;
      affinityLevel: number;
      promptLength: number;
    } | null;
    count: number;
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
  users?: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    affinityLevel: number;
    lastInteraction: string;
    messageCount: number;
    totalTokensUsed: number;
  }>;
}

export default function AdminChatDiagnosticsDetailPage({ 
  params 
}: { 
  params: Promise<{ characterId: string }> 
}) {
  const resolvedParams = use(params);
  const characterId = resolvedParams.characterId;
  const router = useRouter();
  const [diagnostics, setDiagnostics] = useState<ChatDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchDiagnostics = useCallback(async (userId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const url = userId 
        ? `/api/v1/debug/admin/chat-diagnostics/${characterId}?userId=${userId}`
        : `/api/v1/debug/admin/chat-diagnostics/${characterId}`;
        
      const response = await adminFetch(url);
      
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
  }, [fetchDiagnostics]);

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    fetchDiagnostics(userId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">エラー</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={() => fetchDiagnostics()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                再試行
              </button>
              <button
                onClick={() => router.push('/admin/chat-diagnostics')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!diagnostics) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ja-JP');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/chat-diagnostics')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {diagnostics.character.name.ja} - チャット診断
                </h1>
                <p className="text-sm text-gray-500">
                  Character ID: {diagnostics.character.id}
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchDiagnostics(selectedUserId || undefined)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>更新</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左カラム - ユーザーリスト */}
          {diagnostics.users && diagnostics.users.length > 0 && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  このキャラクターを使用中のユーザー
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {diagnostics.users.map((user) => (
                    <button
                      key={user.userId}
                      onClick={() => handleUserSelect(user.userId)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedUserId === user.userId
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.userName}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {user.userEmail}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-gray-600">
                          親密度: {user.affinityLevel}%
                        </span>
                        <span className="text-gray-600">
                          {user.messageCount} メッセージ
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 右カラム - 診断詳細 */}
          <div className={diagnostics.users && diagnostics.users.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="space-y-6">
              {/* キャラクター情報 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  キャラクター情報
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">AIモデル</p>
                    <p className="font-medium text-gray-900">{diagnostics.character.aiModel}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ステータス</p>
                    <div className="flex items-center space-x-2">
                      {diagnostics.character.isActive ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-green-700">アクティブ</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-red-700">非アクティブ</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">年齢</p>
                    <p className="font-medium text-gray-900">{diagnostics.prompt.characterInfo.age}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">職業</p>
                    <p className="font-medium text-gray-900">{diagnostics.prompt.characterInfo.occupation}</p>
                  </div>
                </div>
              </div>

              {/* チャット統計 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  チャット統計
                  {selectedUserId && <span className="ml-2 text-sm text-gray-500">（特定ユーザー）</span>}
                </h2>
                {diagnostics.chat.exists ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">総メッセージ数</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatNumber(diagnostics.chat.messageCount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">総トークン使用量</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatNumber(diagnostics.chat.totalTokensUsed)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">最終アクティビティ</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(diagnostics.chat.lastActivity)}
                        </p>
                      </div>
                    </div>

                    {/* AI記憶システム */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">
                        {diagnostics.chat.conversationHistory.description}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">DB内の総メッセージ数</p>
                          <p className="font-medium text-gray-900">{diagnostics.chat.conversationHistory.totalMessagesInDB}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">AIに送信されるメッセージ数</p>
                          <p className="font-medium text-gray-900">{diagnostics.chat.conversationHistory.messagesUsedForContext}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">コンテキストウィンドウ</p>
                          <p className="font-medium text-gray-900">{diagnostics.chat.conversationHistory.contextWindowSize}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">文字数制限</p>
                          <p className="font-medium text-gray-900">{diagnostics.chat.conversationHistory.truncationLimit}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">チャット履歴がありません</p>
                )}
              </div>

              {/* キャッシュ状態 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <HardDrive className="w-5 h-5 mr-2" />
                  プロンプトキャッシュ
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">キャッシュ状態</span>
                    <div className="flex items-center space-x-2">
                      {diagnostics.cache.exists ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-green-700">キャッシュあり</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-yellow-500" />
                          <span className="text-yellow-700">キャッシュなし</span>
                        </>
                      )}
                    </div>
                  </div>
                  {diagnostics.cache.data && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">使用回数</span>
                        <span className="font-medium text-gray-900">{diagnostics.cache.data.useCount}回</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">プロンプト長</span>
                        <span className="font-medium text-gray-900">{diagnostics.cache.data.promptLength}文字</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">総キャッシュ数</span>
                    <span className="font-medium text-gray-900">{diagnostics.cache.count}件</span>
                  </div>
                </div>
              </div>

              {/* 最新のトークン使用情報 */}
              {diagnostics.tokenUsage && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Cpu className="w-5 h-5 mr-2" />
                    最新のトークン使用情報
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">最終使用日時</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(diagnostics.tokenUsage.lastUsed)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">トークン使用量</span>
                      <span className="font-medium text-gray-900">
                        {formatNumber(diagnostics.tokenUsage.tokensUsed)} トークン
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">AIモデル</span>
                      <span className="font-medium text-gray-900">{diagnostics.tokenUsage.aiModel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">キャッシュヒット</span>
                      <div className="flex items-center space-x-2">
                        {diagnostics.tokenUsage.cacheHit ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-green-700">ヒット</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-700">ミス</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">API使用コスト</span>
                      <span className="font-medium text-gray-900">
                        ${diagnostics.tokenUsage.apiCost.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* システム状態 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  システム状態
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">MongoDB</span>
                    <div className="flex items-center space-x-2">
                      {diagnostics.system.mongoConnected ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-green-700">接続中</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-red-700">切断</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Redis</span>
                    <div className="flex items-center space-x-2">
                      {diagnostics.system.redisConnected ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-green-700">接続中</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-red-700">切断</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">現在のモデル</span>
                    <span className="font-medium text-gray-900">{diagnostics.system.currentModel}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}