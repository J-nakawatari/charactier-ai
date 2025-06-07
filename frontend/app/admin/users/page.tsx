'use client';

import UserStats from '@/components/admin/UserStats';
import UserTable from '@/components/admin/UserTable';
import { Search, Filter, UserPlus, Download } from 'lucide-react';
import { mockUsers } from '@/mock/adminData';

export default function UsersPage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
            <p className="text-sm text-gray-500 mt-1">
              登録ユーザーの管理とアクティビティ監視
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 検索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ユーザー検索..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>
            
            {/* フィルター */}
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              <span className="text-sm">フィルター</span>
            </button>
            
            {/* エクスポート */}
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm">エクスポート</span>
            </button>
            
            {/* 新規追加 */}
            <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <UserPlus className="w-4 h-4" />
              <span className="text-sm">新規ユーザー</span>
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-6 space-y-6">
        {/* 統計カード */}
        <UserStats users={mockUsers} />
        
        {/* ユーザーテーブル */}
        <UserTable users={mockUsers} />
      </main>
    </div>
  );
}