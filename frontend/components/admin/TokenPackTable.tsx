'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Edit, Trash2, Plus, Eye, ToggleLeft, ToggleRight } from 'lucide-react';

interface TokenPack {
  _id: string;
  name: string;
  description: string;
  tokens: number;
  price: number;
  priceId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profitMargin?: number;
  tokenPerYen?: number;
}

interface TokenPackTableProps {
  onCreatePack: () => void;
  onEditPack: (pack: TokenPack) => void;
}

export interface TokenPackTableRef {
  refreshTokenPacks: () => void;
}

const TokenPackTable = forwardRef<TokenPackTableRef, TokenPackTableProps>(({ onCreatePack, onEditPack }, ref) => {
  const { success, error, warning } = useToast();
  const [tokenPacks, setTokenPacks] = useState<TokenPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);

  const fetchTokenPacks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      
      if (isActiveFilter !== undefined) {
        params.append('isActive', isActiveFilter.toString());
      }

      const response = await fetch(`/api/admin/token-packs?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch token packs');
      }
      
      const data = await response.json();
      setTokenPacks(data.tokenPacks || []);
    } catch (err) {
      error('読み込みエラー', 'トークンパック一覧の取得に失敗しました');
      console.error('Failed to fetch token packs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenPacks();
  }, [page, isActiveFilter]);

  // 外部からリフレッシュできるようにする
  useImperativeHandle(ref, () => ({
    refreshTokenPacks: fetchTokenPacks
  }));

  const handleDeletePack = async (pack: TokenPack) => {
    if (!confirm(`「${pack.name}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/token-packs/${pack._id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete token pack');
      }

      success('削除完了', `トークンパック「${pack.name}」を削除しました`);
      fetchTokenPacks(); // Refresh the list
    } catch (err) {
      error('削除エラー', 'トークンパックの削除に失敗しました');
      console.error('Failed to delete token pack:', err);
    }
  };

  const handleToggleActive = async (pack: TokenPack) => {
    const newStatus = !pack.isActive;
    
    try {
      const response = await fetch(`/api/admin/token-packs/${pack._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: newStatus
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update token pack status');
      }

      const statusText = newStatus ? 'アクティブ' : '非アクティブ';
      success('ステータス更新', `「${pack.name}」を${statusText}に変更しました`);
      fetchTokenPacks(); // Refresh the list
    } catch (err) {
      error('更新エラー', 'ステータスの更新に失敗しました');
      console.error('Failed to update token pack status:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ja-JP');
  };

  const getProfitMarginColor = (margin?: number) => {
    if (!margin) return 'text-gray-500';
    if (margin < 45) return 'text-red-600';
    if (margin < 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-4 md:px-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">トークンパック管理</h3>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-4 md:px-6 border-b border-gray-200">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">トークンパック管理</h3>
            <p className="text-sm text-gray-500 mt-1">販売中のトークンパックの管理</p>
          </div>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
            {/* アクティブフィルター */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">表示:</label>
              <select 
                value={isActiveFilter === undefined ? 'all' : isActiveFilter.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  setIsActiveFilter(value === 'all' ? undefined : value === 'true');
                  setPage(1);
                }}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">すべて</option>
                <option value="true">アクティブのみ</option>
                <option value="false">非アクティブのみ</option>
              </select>
            </div>
            
            {/* パック作成ボタン */}
            <button 
              onClick={onCreatePack}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>パック作成</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* デスクトップ表示 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                パック名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                トークン数
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                価格
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                単価
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                利益率
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
            {tokenPacks.map((pack) => (
              <tr key={pack._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{pack.name}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {pack.description}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(pack.tokens)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ¥{formatNumber(pack.price)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {pack.tokenPerYen?.toFixed(1)}/円
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-medium ${getProfitMarginColor(pack.profitMargin)}`}>
                    {pack.profitMargin?.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleActive(pack)}
                    className="flex items-center space-x-1"
                  >
                    {pack.isActive ? (
                      <>
                        <ToggleRight className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-green-700">アクティブ</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-500">非アクティブ</span>
                      </>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => onEditPack(pack)}
                      className="text-gray-400 hover:text-purple-600" 
                      title="編集"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeletePack(pack)}
                      className="text-gray-400 hover:text-red-600" 
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* モバイル表示 */}
      <div className="md:hidden">
        {tokenPacks.map((pack) => (
          <div key={pack._id} className="border-b border-gray-200 p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{pack.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{pack.description}</p>
              </div>
              <button
                onClick={() => handleToggleActive(pack)}
                className="ml-2"
              >
                {pack.isActive ? (
                  <ToggleRight className="w-5 h-5 text-green-500" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
              <div>
                <span className="text-gray-500">トークン:</span>
                <span className="ml-1 font-medium">{formatNumber(pack.tokens)}</span>
              </div>
              <div>
                <span className="text-gray-500">価格:</span>
                <span className="ml-1 font-medium">¥{formatNumber(pack.price)}</span>
              </div>
              <div>
                <span className="text-gray-500">単価:</span>
                <span className="ml-1">{pack.tokenPerYen?.toFixed(1)}/円</span>
              </div>
              <div>
                <span className="text-gray-500">利益率:</span>
                <span className={`ml-1 font-medium ${getProfitMarginColor(pack.profitMargin)}`}>
                  {pack.profitMargin?.toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3">
              <button 
                onClick={() => onEditPack(pack)}
                className="flex items-center space-x-1 text-purple-600 hover:text-purple-700"
              >
                <Edit className="w-4 h-4" />
                <span className="text-sm">編集</span>
              </button>
              <button 
                onClick={() => handleDeletePack(pack)}
                className="flex items-center space-x-1 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">削除</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {tokenPacks.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500">トークンパックが見つかりませんでした</p>
          <button 
            onClick={onCreatePack}
            className="mt-4 text-purple-600 hover:text-purple-700 text-sm"
          >
            最初のパックを作成する
          </button>
        </div>
      )}
    </div>
  );
});

TokenPackTable.displayName = 'TokenPackTable';

export default TokenPackTable;