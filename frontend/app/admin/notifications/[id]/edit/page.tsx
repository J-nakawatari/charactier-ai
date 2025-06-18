'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  Star, 
  Gift,
  Calendar,
  Users,
  Target
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
  createdAt: string;
  updatedAt: string;
}

export default function EditNotificationPage() {
  const router = useRouter();
  const params = useParams();
  const notificationId = params?.id as string;

  const [notification, setNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォームデータ
  const [formData, setFormData] = useState({
    titleJa: '',
    titleEn: '',
    messageJa: '',
    messageEn: '',
    type: 'info' as Notification['type'],
    isActive: true,
    isPinned: false,
    priority: 0,
    targetType: 'all' as TargetCondition['type'],
    validFrom: '',
    validUntil: '',
    // ターゲット条件の詳細
    userIds: '',
    minLevel: 0,
    maxLevel: 100,
    hasPurchases: false,
    registeredAfter: '',
    registeredBefore: ''
  });

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
      
      // フォームデータに反映
      setFormData({
        titleJa: data.title?.ja || '',
        titleEn: data.title?.en || '',
        messageJa: data.message?.ja || '',
        messageEn: data.message?.en || '',
        type: data.type || 'info',
        isActive: data.isActive ?? true,
        isPinned: data.isPinned ?? false,
        priority: data.priority || 0,
        targetType: data.targetCondition?.type || 'all',
        validFrom: data.validFrom ? new Date(data.validFrom).toISOString().slice(0, 16) : '',
        validUntil: data.validUntil ? new Date(data.validUntil).toISOString().slice(0, 16) : '',
        userIds: data.targetCondition?.userIds?.join(',') || '',
        minLevel: data.targetCondition?.minLevel || 0,
        maxLevel: data.targetCondition?.maxLevel || 100,
        hasPurchases: data.targetCondition?.hasPurchases || false,
        registeredAfter: data.targetCondition?.registeredAfter ? new Date(data.targetCondition.registeredAfter).toISOString().slice(0, 10) : '',
        registeredBefore: data.targetCondition?.registeredBefore ? new Date(data.targetCondition.registeredBefore).toISOString().slice(0, 10) : ''
      });
      
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


  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      const token = localStorage.getItem('adminAccessToken');
      
      // ターゲット条件を構築
      const targetCondition: TargetCondition = {
        type: formData.targetType
      };
      
      if (formData.targetType === 'specific_users' && formData.userIds) {
        targetCondition.userIds = formData.userIds.split(',').map(id => id.trim()).filter(id => id);
      }
      
      if (formData.targetType === 'user_level') {
        targetCondition.minLevel = formData.minLevel;
        targetCondition.maxLevel = formData.maxLevel;
      }
      
      if (formData.targetType === 'purchase_history') {
        targetCondition.hasPurchases = formData.hasPurchases;
      }
      
      if (formData.targetType === 'registration_date') {
        if (formData.registeredAfter) {
          targetCondition.registeredAfter = new Date(formData.registeredAfter).toISOString();
        }
        if (formData.registeredBefore) {
          targetCondition.registeredBefore = new Date(formData.registeredBefore).toISOString();
        }
      }
      
      const updateData = {
        title: {
          ja: formData.titleJa,
          en: formData.titleEn
        },
        message: {
          ja: formData.messageJa,
          en: formData.messageEn
        },
        type: formData.type,
        isActive: formData.isActive,
        isPinned: formData.isPinned,
        priority: formData.priority,
        targetCondition,
        validFrom: new Date(formData.validFrom).toISOString(),
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined
      };
      
      const response = await fetch(`/api/notifications/admin/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 成功したら詳細ページへ
      router.push(`/admin/notifications/${notificationId}`);
    } catch (error) {
      console.error('お知らせ更新エラー:', error);
      setError('お知らせの更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // タイプアイコン取得
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'urgent': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'maintenance': return <Wrench className="w-5 h-5 text-gray-500" />;
      case 'feature': return <Star className="w-5 h-5 text-purple-500" />;
      case 'event': return <Gift className="w-5 h-5 text-pink-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-red-600 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <p>{error || 'お知らせが見つかりません'}</p>
              <button
                onClick={() => router.push('/admin/notifications')}
                className="mt-4 text-purple-600 hover:text-purple-700"
              >
                一覧に戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/admin/notifications/${notificationId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            詳細に戻る
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900">お知らせ編集</h1>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">
            {/* 基本情報 */}
            <div>
              <h2 className="text-lg font-semibold mb-4">基本情報</h2>
              
              <div className="grid grid-cols-1 gap-4">
                {/* タイトル */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      タイトル（日本語）
                    </label>
                    <input
                      type="text"
                      value={formData.titleJa}
                      onChange={(e) => setFormData({ ...formData, titleJa: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      タイトル（英語）
                    </label>
                    <input
                      type="text"
                      value={formData.titleEn}
                      onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      required
                    />
                  </div>
                </div>

                {/* メッセージ */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      メッセージ（日本語）
                    </label>
                    <textarea
                      value={formData.messageJa}
                      onChange={(e) => setFormData({ ...formData, messageJa: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      メッセージ（英語）
                    </label>
                    <textarea
                      value={formData.messageEn}
                      onChange={(e) => setFormData({ ...formData, messageEn: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      required
                    />
                  </div>
                </div>

                {/* タイプと優先度 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      タイプ
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as Notification['type'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    >
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      優先度
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                  </div>
                </div>

                {/* フラグ */}
                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">有効</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isPinned}
                      onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">ピン留め</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 表示期間 */}
            <div>
              <h2 className="text-lg font-semibold mb-4">表示期間</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    開始日時
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    終了日時（任意）
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* ターゲット設定 */}
            <div>
              <h2 className="text-lg font-semibold mb-4">ターゲット設定</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    対象ユーザー
                  </label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value as TargetCondition['type'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  >
                    <option value="all">全ユーザー</option>
                    <option value="specific_users">特定ユーザー</option>
                    <option value="user_level">ユーザーレベル</option>
                    <option value="purchase_history">購入履歴</option>
                    <option value="registration_date">登録日</option>
                  </select>
                </div>

                {/* 条件詳細 */}
                {formData.targetType === 'specific_users' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ユーザーID（カンマ区切り）
                    </label>
                    <input
                      type="text"
                      value={formData.userIds}
                      onChange={(e) => setFormData({ ...formData, userIds: e.target.value })}
                      placeholder="user1,user2,user3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                  </div>
                )}

                {formData.targetType === 'user_level' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        最小レベル
                      </label>
                      <input
                        type="number"
                        value={formData.minLevel}
                        onChange={(e) => setFormData({ ...formData, minLevel: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        最大レベル
                      </label>
                      <input
                        type="number"
                        value={formData.maxLevel}
                        onChange={(e) => setFormData({ ...formData, maxLevel: parseInt(e.target.value) || 100 })}
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      />
                    </div>
                  </div>
                )}

                {formData.targetType === 'purchase_history' && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.hasPurchases}
                      onChange={(e) => setFormData({ ...formData, hasPurchases: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">購入履歴がある</span>
                  </label>
                )}

                {formData.targetType === 'registration_date' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        登録日（以降）
                      </label>
                      <input
                        type="date"
                        value={formData.registeredAfter}
                        onChange={(e) => setFormData({ ...formData, registeredAfter: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        登録日（以前）
                      </label>
                      <input
                        type="date"
                        value={formData.registeredBefore}
                        onChange={(e) => setFormData({ ...formData, registeredBefore: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* アクション */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-lg">
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push(`/admin/notifications/${notificationId}`)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isSaving}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                disabled={isSaving}
              >
                <Save className="w-5 h-5" />
                <span>{isSaving ? '保存中...' : '保存'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}