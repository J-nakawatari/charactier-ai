'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TokenStats from '@/components/admin/TokenStats';
import TokenManagementTable from '@/components/admin/TokenManagementTable';
import TokenPackTable, { TokenPackTableRef } from '@/components/admin/TokenPackTable';
import TokenPackModal from '@/components/admin/TokenPackModal';
import { useToast } from '@/contexts/ToastContext';
import { Search, Filter, Plus, Download, CreditCard, Package, Users } from 'lucide-react';
import { mockTokenUsage, mockUsers } from '@/mock/adminData';

interface TokenPack {
  _id?: string;
  name: string;
  description: string;
  tokens: number;
  price: number;
  priceId?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  profitMargin?: number;
  tokenPerYen?: number;
}

export default function TokensPage() {
  const { success } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // URLクエリパラメータからタブを取得、デフォルトは'users'
  const getInitialTab = (): 'users' | 'packs' => {
    const tab = searchParams.get('tab');
    return tab === 'packs' ? 'packs' : 'users';
  };
  
  const [activeTab, setActiveTab] = useState<'users' | 'packs'>(getInitialTab());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<TokenPack | null>(null);
  const tokenPackTableRef = useRef<TokenPackTableRef>(null);

  // URLクエリパラメータの変更を監視
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [searchParams]);

  const handleTabChange = (tab: 'users' | 'packs') => {
    setActiveTab(tab);
    // URLクエリパラメータを更新
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/admin/tokens?${params.toString()}`);
  };

  const handleCreatePack = () => {
    setEditingPack(null);
    setIsModalOpen(true);
  };

  const handleEditPack = (pack: TokenPack) => {
    setEditingPack(pack);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPack(null);
  };

  const handleModalSave = () => {
    // Modal will handle the actual save, we just need to trigger refresh
    if (tokenPackTableRef.current) {
      tokenPackTableRef.current.refreshTokenPacks();
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 md:p-6 pr-16 lg:pr-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">トークン管理</h1>
            <p className="text-sm text-gray-500 mt-1">
              トークン使用状況・パック管理・ユーザー残高の管理
            </p>
          </div>
          
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
            {/* 検索（ユーザータブでのみ表示） */}
            {activeTab === 'users' && (
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="ユーザー検索..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:w-auto"
                />
              </div>
            )}
            
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
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="mt-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>ユーザー管理</span>
              </div>
            </button>
            <button
              onClick={() => handleTabChange('packs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'packs'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>パック管理</span>
              </div>
            </button>
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
          {/* 統計カード */}
          <TokenStats tokenUsage={mockTokenUsage} users={mockUsers} />
          
          {/* タブコンテンツ */}
          {activeTab === 'users' ? (
            <TokenManagementTable users={mockUsers} />
          ) : (
            <TokenPackTable 
              ref={tokenPackTableRef}
              onCreatePack={handleCreatePack}
              onEditPack={handleEditPack}
            />
          )}
        </div>
      </main>

      {/* トークンパック作成・編集モーダル */}
      <TokenPackModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        editingPack={editingPack}
      />
    </div>
  );
}