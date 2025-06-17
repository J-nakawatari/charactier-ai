'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import UserSidebar from '@/components/user/UserSidebar';
import { useToast } from '@/contexts/ToastContext';
import { 
  User, 
  Mail, 
  Lock, 
  AlertTriangle, 
  Save, 
  Eye, 
  EyeOff,
  UserX,
  Edit3,
  X
} from 'lucide-react';

interface UserData {
  _id: string;
  name: string;
  email: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ja';
  const t = useTranslations('settings');
  const { success, error } = useToast();
  
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'account'>('profile');
  
  // プロフィール更新用
  const [profileData, setProfileData] = useState({ name: '', email: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  
  // パスワード変更用
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // 退会用
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ユーザーデータの取得
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          router.push(`/${locale}/login`);
          return;
        }

        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push(`/${locale}/login`);
            return;
          }
          throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        const user = data.user || data;
        setUserData(user);
        setProfileData({ name: user.name || '', email: user.email || '' });
      } catch (err) {
        console.error('Error fetching user data:', err);
        error('ユーザー情報の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [locale, router, error]);

  // プロフィール更新
  const handleProfileUpdate = async () => {
    if (!profileData.name.trim()) {
      error('ユーザー名を入力してください');
      return;
    }

    if (!profileData.email.trim() || !profileData.email.includes('@')) {
      error('有効なメールアドレスを入力してください');
      return;
    }

    try {
      setProfileLoading(true);
      const token = localStorage.getItem('accessToken');

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      setUserData(updatedUser.user);
      setIsProfileEditing(false);
      success('プロフィールを更新しました');
    } catch (err) {
      console.error('Error updating profile:', err);
      error('プロフィールの更新に失敗しました');
    } finally {
      setProfileLoading(false);
    }
  };

  // プロフィール編集キャンセル
  const handleProfileEditCancel = () => {
    if (userData) {
      setProfileData({ name: userData.name || '', email: userData.email || '' });
    }
    setIsProfileEditing(false);
  };

  // パスワード変更
  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword) {
      error('現在のパスワードを入力してください');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      error('新しいパスワードは8文字以上で入力してください');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      error('新しいパスワードが一致しません');
      return;
    }

    try {
      setPasswordLoading(true);
      const token = localStorage.getItem('accessToken');

      const response = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change password');
      }

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      success('パスワードを変更しました');
    } catch (err) {
      console.error('Error changing password:', err);
      error('パスワードの変更に失敗しました');
    } finally {
      setPasswordLoading(false);
    }
  };

  // アカウント削除
  const handleAccountDeletion = async () => {
    if (deleteConfirmation !== '退会する') {
      error('確認テキストが正しくありません');
      return;
    }

    if (!confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      setDeleteLoading(true);
      const token = localStorage.getItem('accessToken');

      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete account');
      }

      // ローカルストレージをクリア
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      
      success('アカウントを削除しました');
      router.push(`/${locale}/`);
    } catch (err) {
      console.error('Error deleting account:', err);
      error('アカウントの削除に失敗しました');
    } finally {
      setDeleteLoading(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'プロフィール', icon: User },
    { id: 'security' as const, label: 'セキュリティ', icon: Lock },
    { id: 'account' as const, label: 'アカウント', icon: UserX }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* サイドバー */}
      <UserSidebar locale={locale} />
      
      {/* メインコンテンツ */}
      <div className="flex-1 lg:ml-64">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ヘッダー */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">設定</h1>
            <p className="text-gray-600">アカウント情報とセキュリティ設定を管理します</p>
          </div>

          {/* ローディング状態 */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          )}

          {/* メインコンテンツ */}
          {!isLoading && userData && (
            <div className="bg-white rounded-lg shadow-sm border">
              {/* タブナビゲーション */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                        activeTab === tab.id
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* タブコンテンツ */}
              <div className="p-6">
                {/* プロフィールタブ */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">プロフィール情報</h3>
                        {!isProfileEditing && (
                          <button
                            onClick={() => setIsProfileEditing(true)}
                            className="flex items-center space-x-2 px-3 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>プロフィールを編集</span>
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            ユーザー名
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            {isProfileEditing ? (
                              <input
                                type="text"
                                id="name"
                                value={profileData.name}
                                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                                placeholder="ユーザー名を入力"
                              />
                            ) : (
                              <div className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 font-medium">
                                {userData?.name || 'ユーザー名が設定されていません'}
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            メールアドレス
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            {isProfileEditing ? (
                              <input
                                type="email"
                                id="email"
                                value={profileData.email}
                                onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                                placeholder="メールアドレスを入力"
                              />
                            ) : (
                              <div className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 font-medium">
                                {userData?.email || 'メールアドレスが設定されていません'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {isProfileEditing && (
                        <div className="mt-6 flex space-x-3">
                          <button
                            onClick={handleProfileUpdate}
                            disabled={profileLoading}
                            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save className="w-4 h-4" />
                            <span>{profileLoading ? '保存中...' : 'プロフィールを保存'}</span>
                          </button>
                          <button
                            onClick={handleProfileEditCancel}
                            disabled={profileLoading}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="w-4 h-4" />
                            <span>キャンセル</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* セキュリティタブ */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">パスワード変更</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            現在のパスワード
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type={showPasswords.current ? 'text' : 'password'}
                              id="currentPassword"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                              className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                              placeholder="現在のパスワード"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            新しいパスワード
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type={showPasswords.new ? 'text' : 'password'}
                              id="newPassword"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                              className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                              placeholder="新しいパスワード（8文字以上）"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            新しいパスワード（確認）
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type={showPasswords.confirm ? 'text' : 'password'}
                              id="confirmPassword"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                              placeholder="新しいパスワード（確認）"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <button
                          onClick={handlePasswordChange}
                          disabled={passwordLoading}
                          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          <span>{passwordLoading ? '変更中...' : 'パスワードを変更'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* アカウントタブ */}
                {activeTab === 'account' && (
                  <div className="space-y-6">
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex">
                        <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">危険エリア</h3>
                          <div className="mt-2 text-sm text-red-700">
                            <p>アカウントを削除すると、全てのデータが永久に失われます。この操作は取り消せません。</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">アカウント削除</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-3">
                            アカウント削除を確認するため、下のテキストボックスに「<strong>退会する</strong>」と入力してください。
                          </p>
                          <input
                            type="text"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-gray-900 bg-white"
                            placeholder="退会する"
                          />
                        </div>

                        <button
                          onClick={handleAccountDeletion}
                          disabled={deleteLoading || deleteConfirmation !== '退会する'}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <UserX className="w-4 h-4" />
                          <span>{deleteLoading ? '削除中...' : 'アカウントを削除'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}