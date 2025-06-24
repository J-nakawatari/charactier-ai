'use client';

import { useState, useEffect } from 'react';
import { Bell, User, ChevronDown, LogOut, AlertCircle, AlertTriangle, Zap, Globe, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { adminFetch } from '@/utils/admin-fetch';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

interface SystemNotification {
  _id: string;
  title: { ja: string; en: string };
  message: { ja: string; en: string };
  type: 'warning' | 'urgent' | 'info' | 'maintenance';
  createdAt: string;
  isRead?: boolean;
}

export default function TopBar() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  useEffect(() => {
    // ローカルストレージから管理者情報を取得
    const adminUserData = localStorage.getItem('adminUser');
    if (adminUserData) {
      try {
        setAdminUser(JSON.parse(adminUserData));
      } catch (error) {
        console.error('Failed to parse admin user data:', error);
      }
    }
  }, []);

  // 通知を取得
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let shouldContinue = true;

    const fetchNotifications = async () => {
      try {
        // システム通知を取得（警告、緊急、メンテナンスのみ）
        const response = await adminFetch('/api/v1/notifications/admin?type=warning,urgent,maintenance&limit=10', {
          method: 'GET'
        });

        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
          
          // 未読数をカウント
          const unread = data.notifications.filter((n: SystemNotification) => !n.isRead).length;
          setUnreadCount(unread);
        } else if (response.status === 403 || response.status === 401) {
          // 認証エラーの場合はリトライを停止
          console.error('認証エラー: 通知の取得を停止します');
          shouldContinue = false;
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        }
      } catch (error) {
        console.error('通知の取得エラー:', error);
      }
    };

    fetchNotifications();
    
    // 認証エラーでなければ30秒ごとに更新
    if (shouldContinue) {
      interval = setInterval(() => {
        if (shouldContinue) {
          fetchNotifications();
        }
      }, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // ドロップダウンが開いているときに外側クリックで閉じる
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen) {
        setIsDropdownOpen(false);
      }
      if (isNotificationOpen) {
        setIsNotificationOpen(false);
      }
    };

    if (isDropdownOpen || isNotificationOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isDropdownOpen, isNotificationOpen]);

  const handleLogout = () => {
    // ローカルストレージから管理者認証情報をクリア
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    
    // ログインページにリダイレクト
    router.push('/admin/login');
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap = {
      'super_admin': 'スーパー管理者',
      'admin': '管理者',
      'moderator': 'モデレーター'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  // 通知を既読にする
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await adminFetch(`/api/v1/notifications/admin/${notificationId}/read`, {
        method: 'POST'
      });

      if (response.ok) {
        // ローカル状態を更新
        setNotifications(prev => 
          prev.map(n => 
            n._id === notificationId 
              ? { ...n, isRead: true } 
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('既読マークエラー:', error);
    }
  };

  // 通知タイプに応じたアイコンを取得
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'maintenance':
        return <Globe className="w-4 h-4 text-gray-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  // 日時フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 pt-safe">
      <div className="flex items-center justify-between">
        {/* 左側：タイトル */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Charactier AI 管理システム
          </h1>
        </div>

        {/* 右側：通知 + ユーザー情報 */}
        <div className="flex items-center space-x-4">
          {/* 通知ベル */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {/* 未読通知バッジ */}
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* 通知ドロップダウン */}
            {isNotificationOpen && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">システム通知</h3>
                </div>
                
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">通知はありません</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          !notification.isRead ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${
                              !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title.ja}
                            </p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {notification.message.ja}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                              className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="既読にする"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 管理者プロフィール */}
          {adminUser && (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {adminUser.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {adminUser.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getRoleDisplayName(adminUser.role)}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {/* ドロップダウンメニュー */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{adminUser.name}</p>
                    <p className="text-xs text-gray-500">{adminUser.email}</p>
                  </div>
                  
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>プロフィール</span>
                  </button>
                  
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>ログアウト</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}