'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { 
  Edit, 
  Users, 
  Calendar,
  Target,
  AlertCircle,
  Info,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Star,
  Gift,
  Eye,
  MessageSquare,
  TrendingUp
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

export default function NotificationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const notificationId = params.id as string;

  const [notification, setNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // お知らせ詳細を取得
  const fetchNotification = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('adminAccessToken');
      
      const response = await fetch(`/api/notifications/admin/${notificationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setNotification(data);
      setError(null);
    } catch (error) {
      console.error('お知らせ取得エラー:', error);
      setError('お知らせの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [notificationId]);

  useEffect(() => {
    if (notificationId) {
      fetchNotification();
    }
  }, [notificationId, fetchNotification]);

  // タイプアイコン取得
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      case 'success': return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'urgent': return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'maintenance': return <Wrench className="w-6 h-6 text-gray-500" />;
      case 'feature': return <Star className="w-6 h-6 text-purple-500" />;
      case 'event': return <Gift className="w-6 h-6 text-pink-500" />;
      default: return <Info className="w-6 h-6 text-blue-500" />;
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
  const getReadRate = () => {
    if (!notification || notification.totalTargetUsers === 0) return 0;
    return Math.round((notification.totalReads / notification.totalTargetUsers) * 100);
  };

  // 表示率計算
  const getViewRate = () => {
    if (!notification || notification.totalTargetUsers === 0) return 0;
    return Math.round((notification.totalViews / notification.totalTargetUsers) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">お知らせ詳細を読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">{error || 'お知らせが見つかりません'}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
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
                  お知らせ詳細
                </h1>
                <p className="text-gray-600">
                  ID: {notification._id}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push(`/admin/notifications/${notification._id}/edit`)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>編集</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側：メイン情報 */}
          <div className="lg:col-span-2 space-y-6">
            {/* お知らせ内容 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                {getTypeIcon(notification.type)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-gray-900">
                      {notification.title.ja}
                    </h2>
                    {notification.isPinned && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        重要
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      notification.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {notification.isActive ? '公開中' : '非公開'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {getTypeLabel(notification.type)} • 優先度: {notification.priority}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">日本語</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">{notification.title.ja}</h5>
                    <p className="text-gray-700 whitespace-pre-wrap">{notification.message.ja}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">English</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">{notification.title.en}</h5>
                    <p className="text-gray-700 whitespace-pre-wrap">{notification.message.en}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ターゲット設定 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>ターゲット設定</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{getTargetLabel(notification.targetCondition)}</span>
                </div>

                {notification.targetCondition.type === 'user_level' && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      ユーザーレベル {notification.targetCondition.minLevel} 〜 {notification.targetCondition.maxLevel} のユーザーが対象
                    </p>
                  </div>
                )}

                {notification.targetCondition.type === 'purchase_history' && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      {notification.targetCondition.hasPurchases ? '購入履歴があるユーザー' : '購入履歴がないユーザー'}が対象
                    </p>
                  </div>
                )}

                {notification.targetCondition.type === 'registration_date' && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      登録日が{' '}
                      {notification.targetCondition.registeredAfter && 
                        new Date(notification.targetCondition.registeredAfter).toLocaleDateString('ja-JP')
                      }
                      {' 〜 '}
                      {notification.targetCondition.registeredBefore && 
                        new Date(notification.targetCondition.registeredBefore).toLocaleDateString('ja-JP')
                      }
                      {' '}のユーザーが対象
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {notification.totalTargetUsers.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">対象ユーザー数</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {getViewRate()}%
                    </div>
                    <div className="text-sm text-gray-600">表示率</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {getReadRate()}%
                    </div>
                    <div className="text-sm text-gray-600">既読率</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右側：統計・設定情報 */}
          <div className="space-y-6">
            {/* 統計概要 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>統計概要</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">総表示回数</span>
                  </div>
                  <span className="font-semibold">{notification.totalViews.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">総既読回数</span>
                  </div>
                  <span className="font-semibold">{notification.totalReads.toLocaleString()}</span>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">既読率</span>
                    <span className="font-semibold text-purple-600">{getReadRate()}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getReadRate()}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 有効期限 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>有効期限</span>
              </h3>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">開始日時</span>
                  <p className="font-medium">
                    {new Date(notification.validFrom).toLocaleString('ja-JP')}
                  </p>
                </div>
                
                {notification.validUntil ? (
                  <div>
                    <span className="text-sm text-gray-600">終了日時</span>
                    <p className="font-medium">
                      {new Date(notification.validUntil).toLocaleString('ja-JP')}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm text-gray-600">終了日時</span>
                    <p className="font-medium text-blue-600">無期限</p>
                  </div>
                )}
              </div>
            </div>

            {/* 作成者情報 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">作成者情報</h3>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">作成者</span>
                  <p className="font-medium">{notification.createdBy?.name || '不明'}</p>
                  <p className="text-sm text-gray-500">{notification.createdBy?.email || ''}</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600">作成日時</span>
                  <p className="font-medium">
                    {new Date(notification.createdAt).toLocaleString('ja-JP')}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600">最終更新</span>
                  <p className="font-medium">
                    {new Date(notification.updatedAt).toLocaleString('ja-JP')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}