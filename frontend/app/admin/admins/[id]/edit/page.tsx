'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api-config';
import { adminFetch } from '@/utils/admin-fetch';

interface AdminForm {
  name: string;
  email: string;
  role: 'super_admin' | 'moderator';
  isActive: boolean;
}


export default function EditAdminPage() {
  const router = useRouter();
  const params = useParams();
  const adminId = params.id as string;
  const { success, error } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<AdminForm>({
    name: '',
    email: '',
    role: 'moderator',
    isActive: true
  });

  useEffect(() => {
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId]);

  const fetchAdminData = async () => {
    try {
      const response = await adminFetch(`${API_BASE_URL}/api/admin/admins/${adminId}`);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      setFormData({
        name: data.admin.name || '',
        email: data.admin.email || '',
        role: data.admin.role || 'moderator',
        isActive: data.admin.isActive !== false
      });
    } catch (err: any) {
      console.error('❌ 管理者データ取得エラー:', err);
      error('データ取得失敗', err.message || '管理者データの取得に失敗しました');
      router.push('/admin/admins');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      error('入力エラー', '名前とメールアドレスは必須です');
      return;
    }

    setSaving(true);

    try {
      const response = await adminFetch(`${API_BASE_URL}/api/admin/admins/${adminId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      success('更新完了', '管理者情報を更新しました');
      router.push('/admin/admins');
    } catch (err: any) {
      console.error('❌ 管理者更新エラー:', err);
      error('更新失敗', err.message || '管理者の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link 
            href="/admin/admins"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            管理者一覧に戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">管理者編集</h1>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">
            {/* 基本情報 */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    名前 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 役割とステータス */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">役割とステータス</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    役割
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="moderator">モデレーター（閲覧のみ）</option>
                    <option value="super_admin">スーパー管理者（全権限）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ステータス
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.isActive}
                        onChange={() => setFormData(prev => ({ ...prev, isActive: true }))}
                        className="mr-2"
                      />
                      <span className="text-sm">アクティブ</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!formData.isActive}
                        onChange={() => setFormData(prev => ({ ...prev, isActive: false }))}
                        className="mr-2"
                      />
                      <span className="text-sm">無効</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* フッター */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <Link
              href="/admin/admins"
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}