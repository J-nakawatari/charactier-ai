'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Bell, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  BarChart3, 
  Users, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Info,
  AlertCircle,
  Wrench,
  Star,
  Gift,
  Check,
  CheckCheck
} from 'lucide-react';

// 型定義
interface LocalizedString {
  ja: string;
  en: string;
}

interface TargetCondition {
  type: 'all' | 'specific_users' | 'user_level' | 'purchase_history' | 'registration_date';
  userIds?: string[];
  minLevel?: number;
  maxLevel?: number;
  hasPurchases?: boolean;
  registeredAfter?: string;
  registeredBefore?: string;
}

interface Notification {
  _id: string;
  title: LocalizedString;
  message: LocalizedString;
  type: 'info' | 'warning' | 'success' | 'urgent' | 'maintenance' | 'feature' | 'event';
  isActive: boolean;
  isRead?: boolean;
  readAt?: string;
  isPinned: boolean;
  priority: number;
  targetCondition: TargetCondition;
  validFrom: string;
  validUntil?: string;
  totalTargetUsers: number;
  totalViews: number;
  totalReads: number;
  createdBy: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export default function NotificationsManagementPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フィルター状態
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    type: '',
    isActive: '',
    search: ''
  });

  // お知らせ一覧を取得
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('adminAccessToken');
      
      // デバッグ：トークンの存在確認
      console.log('🔍 認証トークン確認:', token ? 'あり' : 'なし');
      if (token) {
        console.log('🔍 トークンの長さ:', token.length);
        
        // 現在のユーザー情報を確認
        try {
          const userResponse = await fetch('/api/debug/current-user', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log('🔍 現在のユーザー情報:', userData);
          }
        } catch (userError) {
          console.log('⚠️ ユーザー情報取得エラー:', userError);
        }
      }
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', filters.limit.toString());
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.isActive !== '') queryParams.append('isActive', filters.isActive);
      if (filters.search) queryParams.append('search', filters.search);

      const response = await fetch(`/api/notifications/admin?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setNotifications(data.notifications);
      setPagination(data.pagination);
      setError(null);
    } catch (error) {
      console.error('お知らせ取得エラー:', error);
      setError('お知らせの取得に失敗しました');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // お知らせ削除
  const deleteNotification = async (id: string) => {
    if (!confirm('このお知らせを削除しますか？')) return;

    try {
      const token = localStorage.getItem('adminAccessToken');
      const response = await fetch(`/api/notifications/admin/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`削除に失敗しました: ${response.status}`);
      }

      await fetchNotifications();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  // 初回読み込み
  useEffect(() => {
    fetchNotifications();
  }, [filters, fetchNotifications]);

  // 通知を既読にする
  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('adminAccessToken');
      if (!token) {
        setError('認証トークンが見つかりません');
        return;
      }

      const response = await fetch(`/api/notifications/admin/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // ローカル状態を更新
        setNotifications(prev => 
          prev.map(n => 
            n._id === notificationId 
              ? { ...n, isRead: true, readAt: new Date().toISOString() } 
              : n
          )
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '既読マークに失敗しました');
      }
    } catch (error) {
      console.error('既読マークエラー:', error);
      setError('既読マークに失敗しました');
    }
  };

  // 一括既読
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('adminAccessToken');
      if (!token) {
        setError('認証トークンが見つかりません');
        return;
      }

      const response = await fetch('/api/notifications/admin/read-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // 全ての通知を既読に更新
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '一括既読に失敗しました');
      }
    } catch (error) {
      console.error('一括既読エラー:', error);
      setError('一括既読に失敗しました');
    }
  };

  // タイプアイコン取得
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'urgent': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'maintenance': return <Wrench className="w-4 h-4 text-gray-500" />;
      case 'feature': return <Star className="w-4 h-4 text-purple-500" />;
      case 'event': return <Gift className="w-4 h-4 text-pink-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  // タイプ表示名取得
  const getTypeLabel = (type: string) => {
    const labels = {
      info: 'お知らせ',
      warning: '警告',
      success: '成功',
      urgent: '緊急',
      maintenance: 'メンテナンス',
      feature: '新機能',
      event: 'イベント'
    };
    return labels[type as keyof typeof labels] || type;
  };

  // ターゲット条件表示名取得
  const getTargetLabel = (condition: TargetCondition) => {
    switch (condition.type) {
      case 'all': return '全ユーザー';
      case 'specific_users': return `特定ユーザー (${condition.userIds?.length || 0}人)`;
      case 'user_level': return `レベル ${condition.minLevel}-${condition.maxLevel}`;
      case 'purchase_history': return condition.hasPurchases ? '購入済みユーザー' : '未購入ユーザー';
      case 'registration_date': return '登録日期間指定';
      default: return '不明';
    }
  };

  // 既読率計算
  const getReadRate = (notification: Notification) => {
    if (notification.totalTargetUsers === 0) return 0;
    return Math.round((notification.totalReads / notification.totalTargetUsers) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">お知らせ管理データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <Image
                  src="/icon/arrow.svg"
                  alt="戻る"
                  width={20}
                  height={20}
                  className="transform rotate-180"
                />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  お知らせ管理
                </h1>
                <p className="text-gray-600">
                  ユーザー向けお知らせの作成・編集・配信管理
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {notifications.some(n => !n.isRead) && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center space-x-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <CheckCheck className="w-5 h-5" />
                  <span>すべて既読</span>
                </button>
              )}
              <button
                onClick={() => router.push('/admin/notifications/new')}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>新規作成</span>
              </button>
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* フィルター */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">検索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="タイトル・メッセージで検索"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">タイプ</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                <option value="info">お知らせ</option>
                <option value="warning">警告</option>
                <option value="success">成功</option>
                <option value="urgent">緊急</option>
                <option value="maintenance">メンテナンス</option>
                <option value="feature">新機能</option>
                <option value="event">イベント</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状態</label>
              <select
                value={filters.isActive}
                onChange={(e) => setFilters({ ...filters, isActive: e.target.value, page: 1 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                <option value="true">公開中</option>
                <option value="false">非公開</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">表示件数</label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), page: 1 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10件</option>
                <option value={20}>20件</option>
                <option value={50}>50件</option>
                <option value={100}>100件</option>
              </select>
            </div>
          </div>
        </div>

        {/* お知らせ一覧 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                お知らせ一覧 ({pagination.totalItems}件)
              </h3>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">お知らせがありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      お知らせ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ターゲット
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      統計
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状態
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      作成日
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <tr key={notification._id} className={`hover:bg-gray-50 ${notification.isRead ? 'opacity-70' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {getTypeIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {notification.title.ja}
                              </p>
                              {notification.isPinned && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  重要
                                </span>
                              )}
                              {!notification.isRead && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  未読
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate max-w-md">
                              {notification.message.ja}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {getTypeLabel(notification.type)}
                              </span>
                              <span className="text-xs text-gray-500">
                                優先度: {notification.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-center space-x-1 mb-1">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">{getTargetLabel(notification.targetCondition)}</span>
                          </div>
                          <p className="text-gray-500">
                            対象: {notification.totalTargetUsers.toLocaleString()}人
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-center space-x-4 mb-1">
                            <span>既読率: {getReadRate(notification)}%</span>
                          </div>
                          <div className="text-gray-500">
                            <div>表示: {notification.totalViews.toLocaleString()}</div>
                            <div>既読: {notification.totalReads.toLocaleString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            notification.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {notification.isActive ? '公開中' : '非公開'}
                          </span>
                          {notification.validUntil && (
                            <span className="text-xs text-gray-500">
                              期限: {new Date(notification.validUntil).toLocaleDateString('ja-JP')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div>
                          {new Date(notification.createdAt).toLocaleDateString('ja-JP')}
                        </div>
                        <div className="text-xs">
                          {notification.createdBy?.name || '不明'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification._id)}
                              className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                              title="既読にする"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/admin/notifications/${notification._id}`)}
                            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                            title="詳細を見る"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/admin/notifications/${notification._id}/edit`)}
                            className="p-2 text-gray-600 hover:text-green-600 transition-colors"
                            title="編集"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteNotification(notification._id)}
                            className="p-2 text-gray-600 hover:text-red-600 transition-colors"
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
          )}

          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {((pagination.currentPage - 1) * filters.limit) + 1} - {Math.min(pagination.currentPage * filters.limit, pagination.totalItems)} / {pagination.totalItems}件
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={pagination.currentPage === 1}
                    onClick={() => setFilters({ ...filters, page: pagination.currentPage - 1 })}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    前へ
                  </button>
                  <span className="px-3 py-1 text-sm">
                    {pagination.currentPage} / {pagination.totalPages}
                  </span>
                  <button
                    disabled={pagination.currentPage === pagination.totalPages}
                    onClick={() => setFilters({ ...filters, page: pagination.currentPage + 1 })}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    次へ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}