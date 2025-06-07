'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { ArrowLeft, Save, X } from 'lucide-react';

export default function UserNewPage() {
  const router = useRouter();
  const { success, error } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    tokenBalance: 10000, // デフォルトで10,000トークン
    isTrialUser: true, // 新規ユーザーはデフォルトでトライアル
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!formData.name.trim()) {
      error('入力エラー', '名前は必須です');
      return;
    }
    
    if (!formData.email.trim()) {
      error('入力エラー', 'メールアドレスは必須です');
      return;
    }

    // メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      error('入力エラー', 'メールアドレスの形式が正しくありません');
      return;
    }

    if (formData.tokenBalance < 0) {
      error('入力エラー', 'トークン残高は0以上で入力してください');
      return;
    }

    // 保存処理（実際の実装では API 呼び出し）
    success('作成完了', `${formData.name}を新規作成しました`);
    
    // ユーザー一覧に戻る
    setTimeout(() => {
      router.push('/admin/users');
    }, 1000);
  };

  const handleCancel = () => {
    router.push('/admin/users');
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 md:p-6 pr-16 lg:pr-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/users')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">新規ユーザー作成</h1>
              <p className="text-sm text-gray-500 mt-1">
                新しいユーザーアカウントを作成
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-6">
              {/* 基本情報 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      名前 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="ユーザー名を入力"
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
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="email@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      初期ステータス
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'suspended' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="active">アクティブ</option>
                      <option value="inactive">非アクティブ</option>
                      <option value="suspended">停止中</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      初期トークン残高
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.tokenBalance}
                      onChange={(e) => setFormData({ ...formData, tokenBalance: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="10000"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      新規ユーザーには通常10,000トークンを付与します
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.isTrialUser}
                        onChange={(e) => setFormData({ ...formData, isTrialUser: e.target.checked })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">トライアルユーザー</span>
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      トライアルユーザーには特別な制限や特典が適用されます
                    </p>
                  </div>
                </div>
              </div>

              {/* 注意事項 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">注意事項</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 作成後、ユーザーにはログイン情報がメールで送信されます</li>
                  <li>• 初回ログイン時にパスワードの変更が求められます</li>
                  <li>• トライアルユーザーは30日間の制限があります</li>
                </ul>
              </div>

              {/* ボタン */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>キャンセル</span>
                </button>
                
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>作成</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}