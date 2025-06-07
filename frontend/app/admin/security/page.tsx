'use client';

import SecurityStats from '@/components/admin/SecurityStats';
import SecurityEventsTable from '@/components/admin/SecurityEventsTable';
import { Search, Filter, Download, Shield, AlertTriangle } from 'lucide-react';
import { mockSecurityEvents } from '@/mock/adminData';

export default function SecurityPage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 md:p-6 pr-16 lg:pr-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">セキュリティ管理</h1>
            <p className="text-sm text-gray-500 mt-1">
              セキュリティイベント・脅威・アクセス制御の監視
            </p>
          </div>
          
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
            {/* 検索 */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="IPアドレス検索..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:w-auto"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              {/* フィルター */}
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-1 sm:flex-none justify-center text-gray-700">
                <Filter className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">フィルター</span>
              </button>
              
              {/* エクスポート */}
              <button className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex-1 sm:flex-none justify-center">
                <Download className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">ログ出力</span>
              </button>
              
              {/* 緊急停止 */}
              <button className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex-1 sm:flex-none justify-center">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">緊急停止</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
          {/* 統計カード */}
          <SecurityStats events={mockSecurityEvents} />
          
          {/* セキュリティイベントテーブル */}
          <SecurityEventsTable events={mockSecurityEvents} />
        </div>
      </main>
    </div>
  );
}