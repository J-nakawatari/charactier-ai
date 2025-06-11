'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShoppingCart, Calendar, CreditCard, Package, Filter, Download, RefreshCw } from 'lucide-react';
import UserSidebar from '@/components/user/UserSidebar';

interface PurchaseItem {
  _id: string;
  type: 'token' | 'character' | 'subscription';
  amount: number;
  price: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  paymentMethod: string;
  date: Date;
  details: string;
  description?: string;
  transactionId?: string;
  invoiceUrl?: string;
}

interface PurchaseHistoryData {
  purchases: PurchaseItem[];
  totalSpent: number;
  totalPurchases: number;
  summary: {
    tokens: { count: number; amount: number };
    characters: { count: number; amount: number };
    subscriptions: { count: number; amount: number };
  };
}

export default function PurchaseHistoryPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ja';
  const t = useTranslations('purchaseHistory');
  
  const [historyData, setHistoryData] = useState<PurchaseHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'token' | 'character' | 'subscription'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 購入履歴データを取得
  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/user/purchase-history', {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setHistoryData(data);
      } catch (error) {
        console.error('Purchase history fetch error:', error);
        // フォールバック: モックデータを使用
        setHistoryData(generateMockData());
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchaseHistory();
  }, []);

  // モックデータは削除済み - APIから取得

  // フィルタリングとソート
  const getFilteredAndSortedPurchases = () => {
    if (!historyData) return [];
    
    let filtered = historyData.purchases;
    
    // フィルタリング
    if (filter !== 'all') {
      filtered = filtered.filter(purchase => purchase.type === filter);
    }
    
    // ソート
    return filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === 'desc' ? b.price - a.price : a.price - b.price;
      }
    });
  };

  // 日付フォーマット
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ステータスの表示
  const getStatusBadge = (status: string) => {
    const statusClasses = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    
    const statusText = {
      completed: '完了',
      pending: '処理中',
      failed: '失敗',
      refunded: '返金済み'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status as keyof typeof statusClasses]}`}>
        {statusText[status as keyof typeof statusText]}
      </span>
    );
  };

  // タイプアイコン
  const getTypeIcon = (type: string) => {
    const icons = {
      token: Package,
      character: ShoppingCart,
      subscription: CreditCard
    };
    const Icon = icons[type as keyof typeof icons] || Package;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
      {/* サイドバー */}
      <UserSidebar locale={locale} />
      
      {/* メインコンテンツ */}
      <div className="flex-1 lg:ml-64 w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          {/* ヘッダー */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4">
              <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
                  {t('title')}
                </h1>
                <p className="text-gray-600 text-xs sm:text-sm md:text-base">
                  {t('subtitle')}
                </p>
              </div>
            </div>

            {/* サマリーカード */}
            {!isLoading && historyData && (
              <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 lg:grid-cols-4 mb-6">
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <h3 className="font-medium text-gray-900 text-sm truncate">{t('summary.totalSpent')}</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    ¥{historyData.totalSpent.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center space-x-2">
                    <Package className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <h3 className="font-medium text-gray-900 text-sm truncate">{t('summary.tokens')}</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {t('summary.count', { count: historyData.summary.tokens.count })}
                  </p>
                  <p className="text-sm text-gray-600">
                    ¥{historyData.summary.tokens.amount.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <h3 className="font-medium text-gray-900 text-sm truncate">{t('summary.characters')}</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {t('summary.characterCount', { count: historyData.summary.characters.count })}
                  </p>
                  <p className="text-sm text-gray-600">
                    ¥{historyData.summary.characters.amount.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    <h3 className="font-medium text-gray-900 text-sm truncate">{t('summary.totalTransactions')}</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {t('summary.count', { count: historyData.totalPurchases })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* フィルターとソート */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="space-y-4 sm:flex sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{t('filters.label')}</span>
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">{t('filters.all')}</option>
                  <option value="token">{t('filters.token')}</option>
                  <option value="character">{t('filters.character')}</option>
                  <option value="subscription">{t('filters.subscription')}</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">{t('sort.label')}</span>
                </div>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split('-');
                    setSortBy(by as any);
                    setSortOrder(order as any);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="date-desc">{t('sort.dateDesc')}</option>
                  <option value="date-asc">{t('sort.dateAsc')}</option>
                  <option value="amount-desc">{t('sort.amountDesc')}</option>
                  <option value="amount-asc">{t('sort.amountAsc')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* ローディング状態 */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          )}

          {/* 購入履歴テーブル（デスクトップ）・カード（モバイル） */}
          {!isLoading && historyData && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* デスクトップ版テーブル */}
              <div className="hidden md:block overflow-x-auto scrollbar-hide">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        商品
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日付
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        金額
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        支払方法
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredAndSortedPurchases().map((purchase) => (
                      <tr key={purchase._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                {getTypeIcon(purchase.type)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {purchase.details}
                              </div>
                              <div className="text-sm text-gray-500">
                                {purchase.type === 'token' ? `${purchase.amount.toLocaleString()}トークン` : 
                                 purchase.type === 'character' ? '1キャラクター' : 
                                 'サブスクリプション'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(purchase.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ¥{purchase.price.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {purchase.paymentMethod}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(purchase.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            {purchase.invoiceUrl && (
                              <button className="text-purple-600 hover:text-purple-700">
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            <button className="text-gray-400 hover:text-gray-600">
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* モバイル版カードリスト */}
              <div className="md:hidden divide-y divide-gray-200">
                {getFilteredAndSortedPurchases().map((purchase) => (
                  <div key={purchase._id} className="p-3 sm:p-4 hover:bg-gray-50">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      {/* アイコン */}
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          {getTypeIcon(purchase.type)}
                        </div>
                      </div>
                      
                      {/* メイン情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {purchase.details}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {purchase.type === 'token' ? t('types.token', { amount: purchase.amount.toLocaleString() }) : 
                               purchase.type === 'character' ? t('types.character') : 
                               t('types.subscription')}
                            </p>
                          </div>
                          <div className="flex-shrink-0 ml-2">
                            {getStatusBadge(purchase.status)}
                          </div>
                        </div>
                        
                        {/* 詳細情報 */}
                        <div className="mt-2 grid grid-cols-1 gap-1 text-xs">
                          <div>
                            <span className="text-gray-500">{t('details.amount')}</span>
                            <span className="font-medium text-gray-900 ml-1">
                              ¥{purchase.price.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">{t('details.paymentMethod')}</span>
                            <span className="text-gray-700 ml-1">{purchase.paymentMethod}</span>
                          </div>
                          <div className="mt-1 text-gray-500">
                            {formatDate(purchase.date)}
                          </div>
                        </div>
                        
                        {/* アクション */}
                        <div className="mt-3 flex items-center space-x-3">
                          {purchase.invoiceUrl && (
                            <button className="flex items-center space-x-1 text-purple-600 hover:text-purple-700">
                              <Download className="w-3 h-3" />
                              <span className="text-xs">{t('details.invoice')}</span>
                            </button>
                          )}
                          <button className="flex items-center space-x-1 text-gray-400 hover:text-gray-600">
                            <RefreshCw className="w-3 h-3" />
                            <span className="text-xs">{t('details.details')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 空状態 */}
              {getFilteredAndSortedPurchases().length === 0 && (
                <div className="text-center py-8 sm:py-12 px-4">
                  <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    {t('empty.title')}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-500">
                    {t('empty.description')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}