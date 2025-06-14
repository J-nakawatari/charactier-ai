'use client';


interface UserData {
  id: string;
  _id: string;
  name: string;
  email: string;
  tokenBalance: number;
  totalSpent: number;
  chatCount: number;
  avgIntimacy: number;
  lastLogin: string;
  status: string;
  isTrialUser: boolean;
  createdAt: string;
}
import { useToast } from '@/contexts/ToastContext';
import { Eye, Ban, Unlock, Trash2 } from 'lucide-react';
import { ensureUserNameString } from '@/utils/userUtils';

interface UserTableProps {
  users: UserData[];
  onUserUpdate?: () => void;
}

export default function UserTable({ users, onUserUpdate }: UserTableProps) {
  const { success, error } = useToast();
  
  // 統一されたユーティリティ関数を使用
  
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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ja-JP');
  };

  const handleViewUser = (user: UserData) => {
    window.location.href = `/admin/users/${user.id}`;
  };

  const handleBanUser = async (user: UserData) => {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    const action = newStatus === 'active' ? '復活' : '停止';
    
    if (!confirm(`${ensureUserNameString(user.name)}のアカウントを${action}しますか？`)) {
      return;
    }
    
    try {
      const adminToken = localStorage.getItem('adminAccessToken');
      
      if (!adminToken) {
        error('認証エラー', '管理者認証が必要です');
        return;
      }

      const response = await fetch(`http://localhost:3004/api/admin/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          banReason: newStatus === 'suspended' ? '管理者による停止' : undefined
        })
      });

      if (!response.ok) {
        throw new Error('ステータス更新に失敗しました');
      }

      if (newStatus === 'active') {
        success('アカウント復活', `${ensureUserNameString(user.name)}のアカウントを復活させました`);
      } else {
        error('アカウント停止', `${ensureUserNameString(user.name)}のアカウントを停止しました`);
      }
      
      // ユーザー一覧を更新
      onUserUpdate?.();
      
    } catch (err) {
      error('エラー', 'ステータスの変更に失敗しました');
      console.error('Status update error:', err);
    }
  };

  // ⚠️ 一時的機能：トークンリセット
  const handleResetTokens = async (user: UserData) => {
    if (!confirm(`⚠️ ${ensureUserNameString(user.name)}のトークン残高(${formatNumber(user.tokenBalance)}枚)を0にリセットしますか？\n\n※これは開発用の一時的機能です`)) {
      return;
    }

    try {
      const adminToken = localStorage.getItem('adminAccessToken');
      
      if (!adminToken) {
        error('認証エラー', '管理者認証が必要です');
        return;
      }

      const response = await fetch(`http://localhost:3004/admin/users/${user.id}/reset-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Token reset failed');
      }

      const result = await response.json();
      success('トークンリセット完了', `${ensureUserNameString(user.name)}のトークン残高を${formatNumber(result.previousBalance)}から0にリセットしました`);
      
      // ユーザー一覧を更新
      onUserUpdate?.();
      
    } catch (err) {
      error('リセットエラー', 'トークンのリセットに失敗しました');
      console.error('Token reset error:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-4 md:px-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">ユーザー一覧</h3>
        <p className="text-sm text-gray-500 mt-1">登録ユーザーの詳細情報表示</p>
      </div>

      {/* モバイル用カードビュー */}
      <div className="block lg:hidden p-4 space-y-4">
        {users.map((user) => (
          <div key={user.id} className={`border border-gray-200 rounded-lg p-4 ${user.status === 'suspended' ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <div className={`text-sm font-medium ${user.status === 'suspended' ? 'text-red-700' : 'text-gray-900'}`}>{ensureUserNameString(user.name)}</div>
                  {user.status === 'suspended' && (
                    <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-200 text-red-800 rounded-full">
                      停止中
                    </span>
                  )}
                  {user.isTrialUser && (
                    <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      トライアル
                    </span>
                  )}
                </div>
                <div className={`text-sm mb-2 ${user.status === 'suspended' ? 'text-red-600' : 'text-gray-500'}`}>{user.email}</div>
                {getStatusBadge(user.status)}
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => handleViewUser(user)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Eye className="w-5 h-5" />
                </button>
                {user.status === 'suspended' ? (
                  <button 
                    onClick={() => handleBanUser(user)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                  >
                    <Unlock className="w-5 h-5" />
                  </button>
                ) : (
                  <button 
                    onClick={() => handleBanUser(user)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Ban className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-xs text-gray-500">トークン残高</div>
                <div className="text-sm font-medium text-gray-900">{formatNumber(user.tokenBalance)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">総支払額</div>
                <div className="text-sm font-medium text-gray-900">¥{formatNumber(user.totalSpent)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">チャット数</div>
                <div className="text-sm font-medium text-gray-900">{formatNumber(user.chatCount)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">平均親密度</div>
                <div className="flex items-center">
                  <div className="text-sm font-medium text-gray-900 mr-2">{user.avgIntimacy.toFixed(1)}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ width: `${user.avgIntimacy}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              最終ログイン: {formatDate(user.lastLogin)}
            </div>
          </div>
        ))}
      </div>

      {/* デスクトップ用テーブルビュー */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ユーザー
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                トークン残高
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                総支払額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                チャット数
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                平均親密度
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最終ログイン
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${user.status === 'suspended' ? 'bg-red-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className={`text-sm font-medium ${user.status === 'suspended' ? 'text-red-700' : 'text-gray-900'}`}>
                      {ensureUserNameString(user.name)}
                      {user.status === 'suspended' && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-200 text-red-800 rounded-full">
                          停止中
                        </span>
                      )}
                      {user.isTrialUser && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          トライアル
                        </span>
                      )}
                    </div>
                    <div className={`text-sm ${user.status === 'suspended' ? 'text-red-600' : 'text-gray-500'}`}>{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(user.tokenBalance)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ¥{formatNumber(user.totalSpent)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(user.chatCount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm text-gray-900 mr-2">{user.avgIntimacy.toFixed(1)}</div>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${user.avgIntimacy}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(user.lastLogin)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-3">
                    <button 
                      onClick={() => handleViewUser(user)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="ユーザー詳細"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {/* ⚠️ 一時的機能：トークンリセット */}
                    <button 
                      onClick={() => handleResetTokens(user)}
                      className="text-gray-400 hover:text-orange-600 transition-colors"
                      title="⚠️ 開発用：トークンを0にリセット"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    {user.status === 'suspended' ? (
                      <button 
                        onClick={() => handleBanUser(user)}
                        className="text-gray-400 hover:text-green-600 transition-colors"
                        title="アカウント復活"
                      >
                        <Unlock className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleBanUser(user)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="アカウント停止"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}