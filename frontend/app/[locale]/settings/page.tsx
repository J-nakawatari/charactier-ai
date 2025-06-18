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
  Globe
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
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
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
        error(t('errors.userDataFetchFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [locale, router, error]);

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
    if (deleteConfirmation !== t('placeholders.deleteInput')) {
      error(t('errors.confirmTextIncorrect'));
      return;
    }

    if (!confirm(t('confirmDialog.deleteAccount'))) {
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
      
      success(t('success.accountDeleted'));
      router.push(`/${locale}/`);
    } catch (err) {
      console.error('Error deleting account:', err);
      error(t('errors.accountDeleteFailed'));
    } finally {
      setDeleteLoading(false);
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
    <div className="min-h-screen bg-gray-50 flex">
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
                        <div>
                          <p className="text-sm text-gray-600 mb-3">
                            {t('account.deleteConfirmation')}
                          </p>
                          <input
                            type="text"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none  text-gray-900 bg-white"
                            placeholder={t('placeholders.deleteInput')}
                          />
                        </div>

                        <button
                          onClick={handleAccountDeletion}
                          disabled={deleteLoading || deleteConfirmation !== t('placeholders.deleteInput')}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <UserX className="w-4 h-4" />
                          <span>{deleteLoading ? t('buttons.deleting') : t('account.deleteButton')}</span>
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