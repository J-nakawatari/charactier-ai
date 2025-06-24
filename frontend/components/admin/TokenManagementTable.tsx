'use client';

import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { CreditCard, Edit2 } from 'lucide-react';
import { ensureUserNameString } from '@/utils/userUtils';
import { API_BASE_URL } from '@/lib/api-config';
import { adminFetch } from '@/utils/admin-fetch';
import TokenUpdateModal from './TokenUpdateModal';

interface UserData {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  isTrialUser: boolean;
  tokenBalance: number;
  totalSpent: number;
  chatCount: number;
  lastLogin: string;
}

interface TokenManagementTableProps {
  users: UserData[];
  onUserUpdate?: () => void;
}

export default function TokenManagementTable({ users, onUserUpdate }: TokenManagementTableProps) {
  const { success, error } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  // 統一されたユーティリティ関数を使用
  const getStatusBadge = (status: string, isTrialUser: boolean) => {
    const statusConfig = {
      active: { label: 'アクティブ', color: 'bg-green-100 text-green-800' },
      inactive: { label: '非アクティブ', color: 'bg-gray-100 text-gray-800' },
      suspended: { label: '停止中', color: 'bg-yellow-100 text-yellow-800' },
      banned: { label: 'BAN', color: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: '不明', color: 'bg-gray-100 text-gray-800' };
    
    return (
      <div className="flex space-x-1">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
          {config.label}
        </span>
        {isTrialUser && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            試用
          </span>
        )}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ja-JP');
  };

  const getTokenBalanceColor = (balance: number) => {
    if (balance < 10000) return 'text-red-600';
    if (balance < 50000) return 'text-yellow-600';
    return 'text-green-600';
  };

  // トークン更新機能
  const handleUpdateTokens = async (newBalance: number) => {
    if (!selectedUser) return;

    try {
      const response = await adminFetch(`/api/v1/admin/users/${selectedUser.id}/reset-tokens`, {
        method: 'POST',
        body: JSON.stringify({
          newBalance: newBalance
        })
      });

      if (!response.ok) {
        throw new Error('Token update failed');
      }

      const result = await response.json();
      success('トークン更新完了', `${ensureUserNameString(selectedUser.name)}のトークン残高を${formatNumber(result.previousBalance)}から${formatNumber(result.newBalance)}に更新しました`);
      
      // ユーザー一覧を更新
      onUserUpdate?.();
      
    } catch (err) {
      error('更新エラー', 'トークンの更新に失敗しました');
      console.error('Token update error:', err);
    }
  };

  const handleOpenModal = (user: UserData) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-4 md:px-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">ユーザートークン管理</h3>
        <p className="text-sm text-gray-500 mt-1">ユーザーのトークン残高と使用状況</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-full" style={{ minWidth: '900px' }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ユーザー
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                トークン残高
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                総支払額
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                チャット数
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最終ログイン
              </th>
              <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                トークン編集
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {ensureUserNameString(user.name).charAt(0)}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {ensureUserNameString(user.name)}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.status, user.isTrialUser)}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <CreditCard className={`w-4 h-4 mr-2 ${getTokenBalanceColor(user.tokenBalance)}`} />
                    <span className={`text-sm font-medium ${getTokenBalanceColor(user.tokenBalance)}`}>
                      {formatNumber(user.tokenBalance)}
                    </span>
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ¥{formatNumber(user.totalSpent)}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(user.chatCount)}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(user.lastLogin)}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => handleOpenModal(user)}
                    className="text-gray-400 hover:text-purple-600 transition-colors" 
                    title="トークン残高を編集"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* トークン更新モーダル */}
      <TokenUpdateModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
        onUpdate={handleUpdateTokens}
        user={selectedUser}
      />
    </div>
  );
}