'use client';

import { useToast } from '@/contexts/ToastContext';
import { Eye, Edit, CreditCard, Plus, Minus } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  isTrialUser: boolean;
  tokenBalance: number;
  totalSpent: number;
  chatCount: number;
  lastLogin: string;
}

interface TokenManagementTableProps {
  users: UserData[];
}

export default function TokenManagementTable({ users }: TokenManagementTableProps) {
  const { success, warning, info } = useToast();
  const getStatusBadge = (status: string, isTrialUser: boolean) => {
    const statusConfig = {
      active: { label: 'アクティブ', color: 'bg-green-100 text-green-800' },
      inactive: { label: '非アクティブ', color: 'bg-gray-100 text-gray-800' },
      suspended: { label: '停止中', color: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    
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

  const handleViewUser = (user: UserData) => {
    info('ユーザー詳細', `${user.name}のトークン詳細を表示しました`);
  };

  const handleEditUser = (user: UserData) => {
    success('編集モード', `${user.name}の情報編集画面を開きました`);
  };

  const handleAddTokens = (user: UserData) => {
    success('トークン追加', `${user.name}にトークンを追加しました`);
  };

  const handleRemoveTokens = (user: UserData) => {
    warning('トークン減算', `${user.name}からトークンを減算しました`);
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
                操作
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
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
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
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => handleViewUser(user)}
                      className="text-gray-400 hover:text-gray-600" 
                      title="詳細表示"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEditUser(user)}
                      className="text-gray-400 hover:text-purple-600" 
                      title="編集"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleAddTokens(user)}
                      className="text-gray-400 hover:text-green-600" 
                      title="トークン追加"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleRemoveTokens(user)}
                      className="text-gray-400 hover:text-red-600" 
                      title="トークン減算"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
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