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
  X,
  Globe,
  Trash2
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
  const tError = useTranslations('errors');
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 言語設定用
  const [selectedLanguage, setSelectedLanguage] = useState(locale);
  const [languageLoading, setLanguageLoading] = useState(false);

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

        const response = await fetch('/api/v1/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include' // Cookieを送信
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
        error(t('errors.userDataFetchFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [locale, router, error, t]);

  // プロフィール更新
  const handleProfileUpdate = async () => {
    if (!profileData.name.trim()) {
      error(t('errors.usernameRequired'));
      return;
    }

    if (!profileData.email.trim() || !profileData.email.includes('@')) {
      error(t('errors.emailRequired'));
      return;
    }

    try {
      setProfileLoading(true);
      const token = localStorage.getItem('accessToken');

      // CSRFトークンをCookieから取得
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];

      const response = await fetch('/api/v1/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include', // Cookieを送信
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      setUserData(updatedUser.user);
      setIsProfileEditing(false);
      success(t('success.profileUpdated'));
    } catch (err) {
      console.error('Error updating profile:', err);
      error(t('errors.profileUpdateFailed'));
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
      error(t('errors.currentPasswordRequired'));
      return;
    }

    if (passwordData.newPassword.length < 8) {
      error(t('errors.newPasswordTooShort'));
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      error(t('errors.newPasswordMismatch'));
      return;
    }

    try {
      setPasswordLoading(true);
      const token = localStorage.getItem('accessToken');

      // CSRFトークンをCookieから取得
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];

      const response = await fetch('/api/v1/user/change-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include', // Cookieを送信
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
      success(t('success.passwordChanged'));
    } catch (err) {
      console.error('Error changing password:', err);
      error(t('errors.passwordChangeFailed'));
    } finally {
      setPasswordLoading(false);
    }
  };

  // アカウント削除
  const handleAccountDeletion = async () => {
    try {
      setDeleteLoading(true);
      const token = localStorage.getItem('accessToken');

      // CSRFトークンを取得
      const csrfRes = await fetch('/api/v1/csrf-token', {
        credentials: 'include'
      });
      const { csrfToken } = await csrfRes.json();

      const response = await fetch('/api/v1/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ confirmDeletion: true })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete account');
      }

      // ローカルストレージをクリア（ユーザー関連のみ）
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('lastSelectedCharacterId');
      localStorage.removeItem('purchasingCharacterName');
      localStorage.removeItem('purchasingCharacterId');
      
      // 他のユーザー関連データもクリア（管理者トークンは除く）
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('admin') && key !== 'locale') {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      success(t('success.accountDeleted'));
      router.push(`/${locale}/`);
    } catch (err) {
      console.error('Error deleting account:', err);
      error(err instanceof Error ? err.message : t('errors.accountDeleteFailed'));
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setDeleteConfirmChecked(false);
    }
  };

  // 言語変更処理
  const handleLanguageChange = async () => {
    if (selectedLanguage === locale) {
      return; // 変更がない場合は何もしない
    }

    try {
      setLanguageLoading(true);
      
      // 言語変更ユーティリティを使用して設定を保存し、ページ遷移
      const { changeLanguage } = await import('@/utils/localeUtils');
      
      success(t('language.languageChanged'));
      
      // 少し遅延を入れてトーストが表示されるようにする
      setTimeout(() => {
        changeLanguage(selectedLanguage as 'ja' | 'en');
      }, 100);
      
    } catch (err) {
      console.error('Error changing language:', err);
      error(t('errors.updateFailed'));
      setSelectedLanguage(locale); // エラー時は元の言語に戻す
      setLanguageLoading(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: t('profile.title'), icon: User },
    { id: 'security' as const, label: t('security.title'), icon: Lock },
    { id: 'account' as const, label: t('account.title'), icon: UserX }
  ];

  return (
    <div className="min-h-dvh bg-gray-50 flex">
      {/* サイドバー */}
      <UserSidebar locale={locale} />
      
      {/* メインコンテンツ */}
      <div className="flex-1 lg:ml-64">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ヘッダー */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
            <p className="text-gray-600">{t('subtitle')}</p>
          </div>

          {/* ローディング状態 */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          )}

          {/* 言語設定セクション */}
          {!isLoading && userData && (
            <div className="bg-white rounded-lg shadow-sm border mb-6">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <Globe className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">{t('language.title')}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('language.currentLanguage')}
                    </label>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                      <Globe className="w-4 h-4" />
                      <span>{locale === 'ja' ? t('language.japanese') : t('language.english')}</span>
                    </div>
                    
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none  text-gray-900 bg-white"
                    >
                      <option value="ja">{t('language.japanese')}</option>
                      <option value="en">{t('language.english')}</option>
                    </select>
                  </div>
                  
                  <div>
                    <button
                      onClick={handleLanguageChange}
                      disabled={languageLoading || selectedLanguage === locale}
                      className="w-full md:w-auto flex items-center justify-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span>{languageLoading ? t('buttons.saving') : t('language.saveLanguage')}</span>
                    </button>
                  </div>
                </div>
              </div>
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
                        <h3 className="text-lg font-medium text-gray-900">{t('profile.title')}</h3>
                        {!isProfileEditing && (
                          <button
                            onClick={() => setIsProfileEditing(true)}
                            className="flex items-center space-x-2 px-3 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>{t('profile.edit')}</span>
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            {t('profile.username')}
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            {isProfileEditing ? (
                              <input
                                type="text"
                                id="name"
                                value={profileData.name}
                                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none  text-gray-900 bg-white"
                                placeholder={t('placeholders.username')}
                              />
                            ) : (
                              <div className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 font-medium">
                                {userData?.name || t('noData.username')}
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            {t('profile.email')}
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            {isProfileEditing ? (
                              <input
                                type="email"
                                id="email"
                                value={profileData.email}
                                onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none  text-gray-900 bg-white"
                                placeholder={t('placeholders.email')}
                              />
                            ) : (
                              <div className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 font-medium">
                                {userData?.email || t('noData.email')}
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
                            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save className="w-4 h-4" />
                            <span>{profileLoading ? t('buttons.saving') : t('profile.save')}</span>
                          </button>
                          <button
                            onClick={handleProfileEditCancel}
                            disabled={profileLoading}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="w-4 h-4" />
                            <span>{t('profile.cancel')}</span>
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
                      <h3 className="text-lg font-medium text-gray-900 mb-4">{t('labels.changePassword')}</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
{t('labels.currentPassword')}
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type={showPasswords.current ? 'text' : 'password'}
                              id="currentPassword"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                              className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none  text-gray-900 bg-white"
                              placeholder={t('placeholders.currentPassword')}
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
                            {t('labels.newPassword')}
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type={showPasswords.new ? 'text' : 'password'}
                              id="newPassword"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                              className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none  text-gray-900 bg-white"
                              placeholder={t('placeholders.newPassword')}
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
                            {t('labels.confirmPassword')}
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type={showPasswords.confirm ? 'text' : 'password'}
                              id="confirmPassword"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none  text-gray-900 bg-white"
                              placeholder={t('placeholders.confirmPassword')}
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
                          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          <span>{passwordLoading ? t('buttons.changing') : t('security.savePassword')}</span>
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
                          <h3 className="text-sm font-medium text-red-800">{t('account.dangerZone')}</h3>
                          <div className="mt-2 text-sm text-red-700">
                            <p>{t('account.deleteWarning')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">{t('labels.deleteAccount')}</h3>
                      
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          {t('account.deleteDescription')}
                        </p>

                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>{t('account.deleteButton')}</span>
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
      
      {/* 削除確認モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-dvh px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* 背景オーバーレイ */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmChecked(false);
              }}
            />

            {/* モーダル本体 */}
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {t('account.deleteModal.title')}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-4">
                      {t('account.deleteModal.description')}
                    </p>
                    <ul className="text-sm text-gray-600 space-y-2 mb-4">
                      <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>{t('account.deleteModal.consequence1')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>{t('account.deleteModal.consequence2')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>{t('account.deleteModal.consequence3')}</span>
                      </li>
                    </ul>
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        {t('account.deleteModal.warning')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-5">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={deleteConfirmChecked}
                    onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    {t('account.deleteModal.confirmText')}
                  </span>
                </label>
              </div>
              
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={!deleteConfirmChecked || deleteLoading}
                  onClick={handleAccountDeletion}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {deleteLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('buttons.deleting')}
                    </div>
                  ) : (
                    t('account.deleteModal.deleteButton')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmChecked(false);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                >
                  {t('account.deleteModal.cancelButton')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}