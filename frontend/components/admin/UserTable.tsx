'use client';

import { UserData } from '@/mock/adminData';
import { Eye, Edit, Ban, Unlock } from 'lucide-react';

interface UserTableProps {
  users: UserData[];
}

export default function UserTable({ users }: UserTableProps) {
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-4 md:px-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">ユーザー一覧</h3>
        <p className="text-sm text-gray-500 mt-1">登録ユーザーの詳細情報と管理</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-full"
               style={{ minWidth: '800px' }}>
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
                平均親密度
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
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.name}
                      {user.isTrialUser && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          トライアル
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(user.tokenBalance)}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ¥{formatNumber(user.totalSpent)}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(user.chatCount)}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm text-gray-900">{user.avgIntimacy.toFixed(1)}</div>
                    <div className="ml-2 w-12 md:w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${user.avgIntimacy}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(user.lastLogin)}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button className="text-gray-400 hover:text-gray-600">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-purple-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    {user.status === 'suspended' ? (
                      <button className="text-gray-400 hover:text-green-600">
                        <Unlock className="w-4 h-4" />
                      </button>
                    ) : (
                      <button className="text-gray-400 hover:text-red-600">
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