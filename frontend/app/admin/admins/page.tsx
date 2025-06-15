'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Plus, Shield, User, Mail, Calendar, MoreVertical, Edit, Trash2 } from 'lucide-react';

interface Admin {
  _id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export default function AdminListPage() {
  const router = useRouter();
  const { success, error } = useToast();
  
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      
      const adminToken = localStorage.getItem('adminAccessToken');
      if (!adminToken) {
        throw new Error('管理者認証が必要です');
      }

      const response = await fetch('http://localhost:5000/api/admin/admins', {
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      setAdmins(data.admins || []);
      console.log('✅ 管理者一覧取得完了:', data.admins.length, '件');
    } catch (err: any) {
      console.error('❌ 管理者一覧取得エラー:', err);
      error('データ取得失敗', err.message || '管理者一覧の取得に失敗しました');
      
      // エラー時はモックデータを表示
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const filteredAdmins = admins.filter(admin =>
    (admin.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (admin.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleText = (role: string) => {
    const roleMap = {
      'super_admin': 'スーパー管理者',
      'admin': '管理者',
      'moderator': 'モデレーター'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colorMap = {
      'super_admin': 'bg-red-100 text-red-800',
      'admin': 'bg-purple-100 text-purple-800',
      'moderator': 'bg-blue-100 text-blue-800'
    };
    return colorMap[role as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">管理者一覧を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 md:p-6 pr-16 lg:pr-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">管理者管理</h1>
            <p className="text-sm text-gray-500 mt-1">
              システム管理者の追加・編集・権限管理
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 検索 */}
            <div className="relative">
              <input
                type="text"
                placeholder="管理者を検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-4 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none text-sm"
              />
            </div>
            
            {/* 新規追加ボタン */}
            <button
              onClick={() => router.push('/admin/admins/new')}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>新しい管理者</span>
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* 統計情報 */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">総管理者数</p>
                    <p className="text-2xl font-bold text-purple-900">{admins.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">アクティブ</p>
                    <p className="text-2xl font-bold text-green-900">
                      {admins.filter(admin => admin.isActive).length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">今日のログイン</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {admins.filter(admin => {
                        if (!admin.lastLogin) return false;
                        const today = new Date().toDateString();
                        const loginDate = new Date(admin.lastLogin).toDateString();
                        return today === loginDate;
                      }).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 管理者一覧 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    管理者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    役割
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    権限数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最終ログイン
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作成日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAdmins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {(admin.name || 'A').charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{admin.name || '名前未設定'}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {admin.email || 'メール未設定'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(admin.role)}`}>
                        {getRoleText(admin.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {admin.permissions.length}個
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {admin.lastLogin ? formatDate(admin.lastLogin) : '未ログイン'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(admin.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        admin.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.isActive ? 'アクティブ' : '無効'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="text-indigo-600 hover:text-indigo-900">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAdmins.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">管理者が見つかりません</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? '検索条件に一致する管理者がいません' : '管理者がまだ登録されていません'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => router.push('/admin/admins/new')}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>最初の管理者を作成</span>
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}