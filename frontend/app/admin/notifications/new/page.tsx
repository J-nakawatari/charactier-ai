'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Save, 
  ArrowLeft, 
  Users, 
  Calendar,
  Target,
  AlertCircle,
  Info,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Star,
  Gift
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

interface NotificationForm {
  title: LocalizedString;
  message: LocalizedString;
  type: 'info' | 'warning' | 'success' | 'urgent' | 'maintenance' | 'feature' | 'event';
  isPinned: boolean;
  priority: number;
  targetCondition: TargetCondition;
  validFrom: string;
  validUntil: string;
}

export default function NewNotificationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [form, setForm] = useState<NotificationForm>({
    title: { ja: '', en: '' },
    message: { ja: '', en: '' },
    type: 'info',
    isPinned: false,
    priority: 0,
    targetCondition: { type: 'all' },
    validFrom: new Date().toISOString().slice(0, 16),
    validUntil: ''
  });

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // バリデーション
      if (!form.title.ja.trim() || !form.title.en.trim()) {
        throw new Error('タイトルは日本語・英語両方とも入力してください');
      }
      if (!form.message.ja.trim() || !form.message.en.trim()) {
        throw new Error('メッセージは日本語・英語両方とも入力してください');
      }

      const token = localStorage.getItem('adminAccessToken');
      const response = await fetch('/api/notifications/admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : undefined,
          validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // 成功時は一覧画面に戻る
      router.push('/admin/notifications');
    } catch (error) {
      console.error('お知らせ作成エラー:', error);
      setError(error instanceof Error ? error.message : 'お知らせの作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ターゲット条件の更新
  const updateTargetCondition = (updates: Partial<TargetCondition>) => {
    setForm({
      ...form,
      targetCondition: { ...form.targetCondition, ...updates }
    });
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
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
              <h1 className="text-3xl font-bold text-gray-900">
                新規お知らせ作成
              </h1>
              <p className="text-gray-600">
                ユーザー向けの新しいお知らせを作成します
              </p>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* タイトル（日本語） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイトル（日本語） *
                </label>
                <input
                  type="text"
                  required
                  value={form.title.ja}
                  onChange={(e) => setForm({
                    ...form,
                    title: { ...form.title, ja: e.target.value }
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none"
                  placeholder="お知らせのタイトルを入力"
                />
              </div>

              {/* タイトル（英語） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイトル（English） *
                </label>
                <input
                  type="text"
                  required
                  value={form.title.en}
                  onChange={(e) => setForm({
                    ...form,
                    title: { ...form.title, en: e.target.value }
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none"
                  placeholder="Enter notification title"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* メッセージ（日本語） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メッセージ（日本語） *
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.message.ja}
                  onChange={(e) => setForm({
                    ...form,
                    message: { ...form.message, ja: e.target.value }
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none"
                  placeholder="お知らせの内容を入力"
                />
              </div>

              {/* メッセージ（英語） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メッセージ（English） *
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.message.en}
                  onChange={(e) => setForm({
                    ...form,
                    message: { ...form.message, en: e.target.value }
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none"
                  placeholder="Enter notification content"
                />
              </div>
            </div>
          </div>

          {/* 表示設定 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">表示設定</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* タイプ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイプ
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none"
                >
                  <option value="info">お知らせ</option>
                  <option value="warning">警告</option>
                  <option value="success">成功</option>
                  <option value="urgent">緊急</option>
                  <option value="maintenance">メンテナンス</option>
                  <option value="feature">新機能</option>
                  <option value="event">イベント</option>
                </select>
                <div className="mt-2 flex items-center space-x-2">
                  {getTypeIcon(form.type)}
                  <span className="text-sm text-gray-600">プレビュー</span>
                </div>
              </div>

              {/* 優先度 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  優先度（0-100）
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  数値が大きいほど上部に表示されます
                </p>
              </div>

              {/* 重要フラグ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  オプション
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPinned"
                    checked={form.isPinned}
                    onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isPinned" className="text-sm text-gray-700">
                    重要なお知らせとして固定表示
                  </label>
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
              {/* ターゲットタイプ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  対象ユーザー
                </label>
                <select
                  value={form.targetCondition.type}
                  onChange={(e) => updateTargetCondition({ type: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none"
                >
                  <option value="all">全ユーザー</option>
                  <option value="user_level">ユーザーレベル指定</option>
                  <option value="purchase_history">購入履歴による指定</option>
                  <option value="registration_date">登録日による指定</option>
                </select>
              </div>

              {/* ユーザーレベル指定 */}
              {form.targetCondition.type === 'user_level' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最小レベル
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.targetCondition.minLevel || ''}
                      onChange={(e) => updateTargetCondition({ 
                        minLevel: parseInt(e.target.value) || undefined 
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最大レベル
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.targetCondition.maxLevel || ''}
                      onChange={(e) => updateTargetCondition({ 
                        maxLevel: parseInt(e.target.value) || undefined 
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 購入履歴指定 */}
              {form.targetCondition.type === 'purchase_history' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    購入履歴
                  </label>
                  <select
                    value={form.targetCondition.hasPurchases?.toString() || ''}
                    onChange={(e) => updateTargetCondition({ 
                      hasPurchases: e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined 
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none"
                  >
                    <option value="">指定なし</option>
                    <option value="true">購入済みユーザー</option>
                    <option value="false">未購入ユーザー</option>
                  </select>
                </div>
              )}

              {/* 登録日指定 */}
              {form.targetCondition.type === 'registration_date' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      登録日（開始）
                    </label>
                    <input
                      type="date"
                      value={form.targetCondition.registeredAfter || ''}
                      onChange={(e) => updateTargetCondition({ 
                        registeredAfter: e.target.value || undefined 
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      登録日（終了）
                    </label>
                    <input
                      type="date"
                      value={form.targetCondition.registeredBefore || ''}
                      onChange={(e) => updateTargetCondition({ 
                        registeredBefore: e.target.value || undefined 
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 有効期限設定 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>有効期限設定</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  開始日時 *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.validFrom}
                  onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  終了日時（任意）
                </label>
                <input
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  未設定の場合は無期限で表示されます
                </p>
              </div>
            </div>
          </div>

          {/* 送信ボタン */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-5 h-5" />
              <span>{isLoading ? '作成中...' : 'お知らせを作成'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}