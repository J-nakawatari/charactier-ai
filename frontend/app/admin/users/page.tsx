'use client';

import { useState, useEffect, useCallback } from 'react';
import UserStats from '@/components/admin/UserStats';
import UserTable from '@/components/admin/UserTable';
import { useToast } from '@/contexts/ToastContext';
import { Search, Filter, Download } from 'lucide-react';
import { adminGet } from '@/utils/admin-api';

interface UserData {
  id: string;
  _id: string;
  name: string;
  email: string;
  tokenBalance: number;
  totalSpent: number;
  chatCount: number;
  lastLogin: string;
  status: string;
  isTrialUser: boolean;
  createdAt: string;
}

interface UsersResponse {
  users: UserData[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function UsersPage() {
  const { success, error } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });

  // Debug function to test cookies
  const testCookies = async () => {
    try {
      const response = await adminGet('/api/v1/debug/auth-status');
      const data = await response.json();
      console.log('🍪 Cookie Test Results:', data);
      success('クッキーテスト', 'Check console for results');
    } catch (err) {
      console.error('🍪 Cookie Test Error:', err);
      error('クッキーテストエラー', 'コンソールを確認してください');
    }
  };

  // ユーザーデータを取得
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const endpoint = `/api/v1/admin/users?${params}`;
      console.log('🔍 Fetching users from:', endpoint);

      const response = await adminGet(endpoint);

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ API Error:', errorData);
        throw new Error(errorData?.message || `Failed to fetch users: ${response.status}`);
      }

      const data: UsersResponse = await response.json();
      console.log('✅ Received data:', data);
      
      setUsers(data.users);
      setPagination(data.pagination);
      
    } catch (err) {
      console.error('Failed to fetch users:', err);
      error('読み込みエラー', 'ユーザー一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, statusFilter, error]);

  // 初回読み込み
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, searchTerm, statusFilter, fetchUsers]);

  // ページがフォーカスされた時に再読み込み（ユーザー詳細から戻った時など）
  useEffect(() => {
    const handleFocus = () => {
      fetchUsers();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        fetchUsers();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', () => {});
    };
  }, [fetchUsers]);

  // 検索処理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 md:p-6 pr-16 lg:pr-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">ユーザー管理</h1>
            <p className="text-sm text-gray-500 mt-1">
              登録ユーザーの情報確認とアクティビティ監視
            </p>
          </div>
          
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
            {/* 検索 */}
            <form onSubmit={handleSearch} className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ユーザー検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg  text-sm sm:w-auto"
              />
            </form>
            
            <div className="flex items-center space-x-2">
              {/* フィルター */}
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-1 sm:flex-none justify-center text-gray-700">
                <Filter className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">フィルター</span>
              </button>
              
              {/* エクスポート */}
              <button className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex-1 sm:flex-none justify-center">
                <Download className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">エクスポート</span>
              </button>
              
              {/* Debug Button (remove in production) */}
              <button 
                onClick={testCookies}
                className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                title="Cookie Debug Test"
              >
                <span className="text-sm">🍪 Debug</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
          {/* 統計カード */}
          <UserStats users={users} />
          
          {/* ユーザーテーブル */}
          {users.length > 0 ? (
            <UserTable users={users} onUserUpdate={fetchUsers} />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">ユーザーが見つかりませんでした</p>
              <button 
                onClick={fetchUsers}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                再読み込み
              </button>
            </div>
          )}
          
          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
              <div className="flex items-center text-sm text-gray-500">
                <span>
                  {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} 件
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  前へ
                </button>
                <span className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}