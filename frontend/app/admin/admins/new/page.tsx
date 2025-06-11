'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { ArrowLeft, User, Mail, Lock, Shield } from 'lucide-react';

export default function CreateAdminPage() {
  const router = useRouter();
  const { success, error } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin' as 'admin' | 'super_admin' | 'moderator'
  });
  
  const [permissions, setPermissions] = useState({
    users: 'read' as 'none' | 'read' | 'write',
    characters: 'read' as 'none' | 'read' | 'write',
    tokens: 'read' as 'none' | 'read' | 'write',
    system: 'none' as 'none' | 'read' | 'write'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const permissionCategories = [
    { 
      key: 'users' as keyof typeof permissions,
      label: 'ユーザー管理', 
      description: 'ユーザー情報の表示・編集・削除'
    },
    { 
      key: 'characters' as keyof typeof permissions,
      label: 'キャラクター管理', 
      description: 'キャラクター情報の表示・作成・編集・削除'
    },
    { 
      key: 'tokens' as keyof typeof permissions,
      label: 'トークン管理', 
      description: 'トークン使用状況・パック管理'
    },
    { 
      key: 'system' as keyof typeof permissions,
      label: 'システム管理', 
      description: 'システム設定・管理者機能'
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // エラーをクリア
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePermissionChange = (category: keyof typeof permissions, level: 'none' | 'read' | 'write') => {
    setPermissions(prev => ({
      ...prev,
      [category]: level
    }));
  };

  const generatePermissionsArray = (perms: typeof permissions): string[] => {
    const result: string[] = [];
    Object.entries(perms).forEach(([category, level]) => {
      if (level === 'read') {
        result.push(`${category}.read`);
      } else if (level === 'write') {
        result.push(`${category}.read`, `${category}.write`);
      }
    });
    return result;
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = '名前を入力してください';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '正しいメールアドレスを入力してください';
    }

    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 6) {
      newErrors.password = 'パスワードは6文字以上で入力してください';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません';
    }

    const hasAnyPermission = Object.values(permissions).some(level => level !== 'none');
    if (!hasAnyPermission) {
      newErrors.permissions = '少なくとも1つの権限を設定してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      
      const adminToken = localStorage.getItem('adminAccessToken');
      if (!adminToken) {
        throw new Error('管理者認証が必要です');
      }

      const response = await fetch('http://localhost:3004/api/admin/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          permissions: generatePermissionsArray(permissions)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '管理者の作成に失敗しました');
      }

      success('管理者作成完了', `${formData.name}を管理者として追加しました`);
      router.push('/admin/admins');

    } catch (err: any) {
      console.error('❌ 管理者作成エラー:', err);
      error('作成失敗', err.message || '管理者の作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 md:p-6 pr-16 lg:pr-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/admins')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">新しい管理者を追加</h1>
              <p className="text-sm text-gray-500 mt-1">
                管理者アカウントを作成して権限を設定します
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本情報 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
              
              <div className="space-y-4">
                {/* 名前 */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    名前
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg text-gray-900 bg-white focus:outline-none ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="管理者の名前を入力"
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* メールアドレス */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg text-gray-900 bg-white focus:outline-none ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="admin@example.com"
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* パスワード */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    パスワード
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg text-gray-900 bg-white focus:outline-none ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="6文字以上のパスワード"
                    disabled={isLoading}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                {/* パスワード確認 */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    パスワード確認
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg text-gray-900 bg-white focus:outline-none ${
                      errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="パスワードを再入力"
                    disabled={isLoading}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* 役割 */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    <Shield className="w-4 h-4 inline mr-2" />
                    役割
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none"
                    disabled={isLoading}
                  >
                    <option value="admin">管理者</option>
                    <option value="super_admin">スーパー管理者</option>
                    <option value="moderator">モデレーター</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 権限設定 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">権限設定</h2>
              
              <div className="space-y-6">
                {permissionCategories.map((category) => (
                  <div key={category.key} className="border rounded-lg p-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-900">{category.label}</h3>
                      <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                    </div>
                    
                    <div className="flex space-x-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`permission-${category.key}`}
                          value="none"
                          checked={permissions[category.key] === 'none'}
                          onChange={() => handlePermissionChange(category.key, 'none')}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-600">なし</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`permission-${category.key}`}
                          value="read"
                          checked={permissions[category.key] === 'read'}
                          onChange={() => handlePermissionChange(category.key, 'read')}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-600">閲覧のみ</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`permission-${category.key}`}
                          value="write"
                          checked={permissions[category.key] === 'write'}
                          onChange={() => handlePermissionChange(category.key, 'write')}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-600">閲覧・編集可能</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              
              {errors.permissions && (
                <p className="mt-4 text-sm text-red-600">{errors.permissions}</p>
              )}
            </div>

            {/* 送信ボタン */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/admin/admins')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    作成中...
                  </div>
                ) : (
                  '管理者を作成'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}