'use client';

import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { mockUsers } from '@/mock/adminData';
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
  Gift
} from 'lucide-react';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error } = useToast();
  
  // TODO: 型を整備する - 管理画面用の型定義を統一
  const user = mockUsers.find(u => u.id === params.id) as any;
  
  if (!user) {
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


  const handleBanToggle = () => {
    if (user.status === 'suspended') {
      success('アカウント復活', `${user.name}のアカウントを復活させました`);
    } else {
      error('アカウント停止', `${user.name}のアカウントを停止しました`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
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
            <button
              onClick={handleBanToggle}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                user.status === 'suspended'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {user.status === 'suspended' ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {user.status === 'suspended' ? '復活' : '停止'}
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
                    {user.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
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
                    {(user as any).loginStreak || 0}日 {/* TODO: 型を整備する */}
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
                    {(user as any).violationCount || 0}回 {/* TODO: 型を整備する */}
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
                {user.unlockedCharacters.map((charId: any) => ( // TODO: 型を整備する
                  <div key={charId} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">{charId}</span>
                    </div>
                    <span className="text-gray-900">キャラクター {charId}</span>
                  </div>
                ))}
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
              {user.affinities && user.affinities.map((affinity: any, index: number) => ( // TODO: 型を整備する
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">キャラクター {affinity.characterId}</span>
                    <span className="text-sm text-gray-500">Lv.{affinity.level}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full" 
                      style={{ width: `${affinity.level}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>総会話数: {affinity.totalConversations}回</div>
                    <div>関係性: {getRelationshipText(affinity.relationshipType)}</div>
                    <div>信頼度: {affinity.trustLevel}%</div>
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