'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { ensureUserNameString } from '@/utils/userUtils';
import { API_BASE_URL } from '@/lib/api-config';
import { adminFetch, adminDelete } from '@/utils/admin-api';

// Inline type definitions
interface User {
  id: string;
  name: string;
  email: string;
  tokenBalance: number;
  chatCount: number;
  avgIntimacy: number;
  totalSpent: number;
  status: string;
  isTrialUser?: boolean;
  loginStreak?: number;
  maxLoginStreak?: number;
  violationCount?: number;
  registrationDate: string;
  lastLogin: string;
  suspensionEndDate?: string;
  banReason?: string;
  unlockedCharacters?: Array<{ id: string; name: string }> | string[];
  affinities?: Array<{
    characterId: string;
    characterName?: string;
    level: number;
    totalConversations: number;
    relationshipType: string;
    trustLevel: number;
  }>;
}
import { 
  ArrowLeft, 
  Ban, 
  Unlock, 
  CreditCard, 
  Heart, 
  MessageSquare,
  Calendar,
  Mail,
  User,
  Shield,
  Clock,
  Target,
  TrendingUp,
  AlertTriangle,
  Gift,
  Trash2
} from 'lucide-react';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        
        const response = await adminFetch(`${API_BASE_URL}/api/v1/admin/users/${params.id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError('ユーザーデータの読み込みに失敗しました');
        console.error('User fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchUser();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ユーザー情報を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }
  
  if (!user && !loading && !error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ユーザーが見つかりません</h1>
          <p className="text-gray-500 mb-4">指定されたユーザーは存在しません。</p>
          <button 
            onClick={() => router.push('/admin/users')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            ユーザー一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  // Show loading or error states
  if (!user) {
    return null;
  }


  // 統一されたユーティリティ関数を使用

  const handleBanToggle = async () => {
    if (!user) return;
    
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    const action = newStatus === 'active' ? '復活' : '停止';
    
    const confirmMessage = newStatus === 'active' 
      ? `${ensureUserNameString(user.name)}のアカウントを復活させますか？\n\n※ 違反回数・違反記録も完全にリセットされます`
      : `${ensureUserNameString(user.name)}のアカウントを停止しますか？`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      console.log('Status update request:', {
        url: `${API_BASE_URL}/api/v1/admin/users/${user.id}/status`,
        newStatus,
        userId: user.id
      });
      
      const response = await adminFetch(`${API_BASE_URL}/api/v1/admin/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          banReason: newStatus === 'suspended' ? '管理者による停止' : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Status update failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error('ステータス更新に失敗しました');
      }

      const result = await response.json();
      
      // ユーザー情報を更新
      setUser(prev => prev ? { 
        ...prev, 
        status: newStatus,
        // アカウント復活時は違反回数もリセット
        ...(newStatus === 'active' && { violationCount: 0 }),
        // 停止解除時は停止関連情報をクリア
        ...(newStatus === 'active' && { suspensionEndDate: undefined, banReason: undefined })
      } : null);
      
      if (newStatus === 'active') {
        success('アカウント復活', `${ensureUserNameString(user.name)}のアカウントを復活させました（違反回数・違反記録もリセットされました）`);
      } else {
        showError('アカウント停止', `${ensureUserNameString(user.name)}のアカウントを停止しました`);
      }
      
    } catch (err) {
      showError('エラー', 'ステータスの変更に失敗しました');
      console.error('Status update error:', err);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    
    if (!confirm(`⚠️ ${ensureUserNameString(user.name)}のアカウントを完全に削除しますか？\n\nこの操作は取り消すことができません。`)) {
      return;
    }
    
    try {
      const userId = user.id;
      console.log('Delete user:', { user, userId, url: `${API_BASE_URL}/api/v1/admin/users/${userId}` });
      
      if (!userId) {
        throw new Error('ユーザーIDが見つかりません');
      }
      const response = await adminDelete(`${API_BASE_URL}/api/v1/admin/users/${userId}`);

      if (!response.ok) {
        throw new Error('ユーザー削除に失敗しました');
      }

      success('ユーザー削除', `${ensureUserNameString(user.name)}のアカウントを削除しました`);
      
      // ユーザー一覧に戻る
      router.push('/admin/users');
      
    } catch (err) {
      showError('エラー', 'ユーザーの削除に失敗しました');
      console.error('User deletion error:', err);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '未ログイン';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '未ログイン';
    
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = (status: string) => {
    const labels = {
      active: 'アクティブ',
      inactive: '非アクティブ', 
      suspended: '停止中',
      banned: '永久停止'
    };
    return labels[status as keyof typeof labels] || status;
  };
  
  const getRelationshipText = (type: string) => {
    const relationships = {
      stranger: '初対面',
      acquaintance: '知り合い',
      friend: '友達',
      close_friend: '親友',
      lover: '恋人'
    };
    return relationships[type as keyof typeof relationships] || type;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      active: 'アクティブ',
      inactive: '非アクティブ',
      suspended: '停止中'
    };

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 md:p-6 pr-16 lg:pr-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/users')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">ユーザー詳細</h1>
              <p className="text-sm text-gray-500 mt-1">
                ユーザー情報と活動履歴（参照のみ）
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {user && (
              <button
                onClick={(e) => {
                  console.log('Delete button clicked!');
                  console.log('Event:', e);
                  console.log('User object:', user);
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteUser();
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">削除</span>
              </button>
            )}
            
            <button
              onClick={handleBanToggle}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                user && user.status === 'suspended'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {user && user.status === 'suspended' ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {user && user.status === 'suspended' ? '復活' : '停止'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 基本情報カード */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl font-medium">
                    {ensureUserNameString(user.name).charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{ensureUserNameString(user.name)}</h2>
                  <p className="text-gray-500">{user.email}</p>
                  <div className="mt-2">
                    {getStatusBadge(user.status)}
                    {user.isTrialUser && (
                      <span className="ml-2 px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        トライアル
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">トークン残高</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {user.tokenBalance.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">チャット数</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {user.chatCount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Heart className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">平均親密度</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {user.avgIntimacy.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">総支払額</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ¥{user.totalSpent.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">ログインストリーク</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {user?.loginStreak || 0}日
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">違反回数</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {user?.violationCount || 0}回
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 詳細情報 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* アカウント情報 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">アカウント情報</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">メールアドレス</p>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">登録日</p>
                    <p className="text-gray-900">{formatDate(user.registrationDate)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">最終ログイン</p>
                    <p className="text-gray-900">{formatDate(user.lastLogin)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">最大ログインストリーク</p>
                    <p className="text-gray-900">{user.maxLoginStreak || 0}日</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 解放キャラクター */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">解放キャラクター</h3>
              <div className="space-y-2">
                {user?.unlockedCharacters?.map((charData, index) => {
                  const charId = typeof charData === 'string' ? charData : (typeof charData === 'object' && charData?.id ? charData.id : `unknown-${index}`);
                  const charName = typeof charData === 'string' ? charData : (typeof charData === 'object' && charData?.name ? String(charData.name) : charId);
                  return (
                    <div key={charId} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">{String(charId).charAt(0)}</span>
                      </div>
                      <span className="text-gray-900">キャラクター {String(charName)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* セキュリティ・制裁情報 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">セキュリティ情報</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">アカウント状態</p>
                    <p className="text-gray-900">{getStatusText(user.status)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">違反履歴</p>
                    <p className="text-gray-900">{user.violationCount || 0}回</p>
                    {user.status === 'suspended' && (user.violationCount || 0) > 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        ※ アカウント復活時にリセットされます
                      </p>
                    )}
                  </div>
                </div>
                
                {user.suspensionEndDate && (
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">停止解除日</p>
                      <p className="text-gray-900">{formatDate(user.suspensionEndDate)}</p>
                    </div>
                  </div>
                )}
                
                {user.banReason && (
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">制裁理由</p>
                      <p className="text-gray-900">{user.banReason}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 親密度・キャラクター関係 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">キャラクター別親密度</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {user?.affinities?.map((affinity, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{affinity.characterName || `キャラクター ${String(affinity.characterId)}`}</span>
                    <span className="text-sm text-gray-500">Lv.{Math.floor(affinity.level)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full" 
                      style={{ width: `${affinity.level}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>総会話数: {String(affinity.totalConversations)}回</div>
                    <div>関係性: {getRelationshipText(String(affinity.relationshipType))}</div>
                    <div>信頼度: {String(affinity.trustLevel)}%</div>
                  </div>
                </div>
              )) || (
                <div className="col-span-full text-center text-gray-500 py-4">
                  まだキャラクターとの会話がありません
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}