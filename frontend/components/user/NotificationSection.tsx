'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle, X, Eye, EyeOff, AlertCircle, Wrench, Star, Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface LocalizedString {
  ja: string;
  en: string;
}

interface Notification {
  _id: string;
  title: LocalizedString;
  message: LocalizedString;
  type: 'info' | 'warning' | 'success' | 'urgent' | 'maintenance' | 'feature' | 'event';
  isPinned: boolean;
  priority: number;
  isRead: boolean;
  isViewed: boolean;
  readAt?: string;
  viewedAt?: string;
  createdAt: string;
  validFrom: string;
  validUntil?: string;
}

interface NotificationSectionProps {
  locale: string;
}

export default function NotificationSection({ locale }: NotificationSectionProps) {
  const t = useTranslations('notifications');
  const tGeneral = useTranslations('general');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // お知らせデータ取得
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/notifications?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setNotifications(data.notifications);
      setError(null);
    } catch (error) {
      console.error('お知らせ取得エラー:', error);
      setError('お知らせの取得に失敗しました');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    fetchNotifications();
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'urgent':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'maintenance':
        return <Wrench className="w-5 h-5 text-gray-500" />;
      case 'feature':
        return <Star className="w-5 h-5 text-purple-500" />;
      case 'event':
        return <Gift className="w-5 h-5 text-pink-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBgColor = (type: string, isRead: boolean, isPinned: boolean) => {
    const baseClasses = isRead ? 'bg-gray-50' : 'bg-white';
    const borderClasses = isPinned ? 'border-yellow-300' : 'border-gray-200';
    let typeClasses = '';
    
    if (!isRead) {
      switch (type) {
        case 'warning':
          typeClasses = 'border-l-orange-400';
          break;
        case 'success':
          typeClasses = 'border-l-green-400';
          break;
        case 'urgent':
          typeClasses = 'border-l-red-400';
          break;
        case 'maintenance':
          typeClasses = 'border-l-gray-400';
          break;
        case 'feature':
          typeClasses = 'border-l-purple-400';
          break;
        case 'event':
          typeClasses = 'border-l-pink-400';
          break;
        default:
          typeClasses = 'border-l-blue-400';
      }
    }
    
    return `${baseClasses} ${borderClasses} ${typeClasses}`;
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('既読マークに失敗しました');
      }

      // ローカル状態を更新
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, isRead: true, readAt: new Date().toISOString() }
            : notification
        )
      );
    } catch (error) {
      console.error('既読マークエラー:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('一括既読マークに失敗しました');
      }

      // ローカル状態を更新
      const now = new Date().toISOString();
      setNotifications(prev => 
        prev.map(notification => ({ 
          ...notification, 
          isRead: true, 
          readAt: now 
        }))
      );
    } catch (error) {
      console.error('一括既読マークエラー:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ローディング表示
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Bell className="w-5 h-5 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-500">{t('loading', {ns: 'general'}) || '読み込み中...'}</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Bell className="w-5 h-5 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-gray-500">{error}</p>
          <button
            onClick={fetchNotifications}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  // お知らせがない場合
  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Bell className="w-5 h-5 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
        </div>
        <div className="text-center py-8">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">新しいお知らせはありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-100 rounded-lg relative">
            <Bell className="w-5 h-5 text-blue-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('title')}
            {unreadCount > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({unreadCount}{t('unreadCount')})
              </span>
            )}
          </h3>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>{tGeneral('markAllRead')}</span>
          </button>
        )}
      </div>

      {/* 通知リスト */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {notifications
          .sort((a, b) => {
            // 重要なお知らせを上部に、その後優先度、最後に作成日時
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            if (a.priority !== b.priority) return b.priority - a.priority;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
          .map((notification) => (
            <div
              key={notification._id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                getNotificationBgColor(notification.type, notification.isRead, notification.isPinned)
              } ${!notification.isRead ? 'border-l-4' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={`font-medium ${
                        notification.isRead ? 'text-gray-600' : 'text-gray-900'
                      }`}>
                        {notification.title[locale as keyof LocalizedString]}
                      </h4>
                      {notification.isPinned && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
  {t('important')}
                        </span>
                      )}
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className={`text-sm ${
                      notification.isRead ? 'text-gray-500' : 'text-gray-700'
                    }`}>
                      {notification.message[locale as keyof LocalizedString]}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {formatDate(notification.createdAt)}
                      </span>
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification._id)}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1 transition-colors"
                        >
                          <EyeOff className="w-3 h-3" />
                          <span>{tGeneral('read')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* フッター */}
      {notifications.length > 3 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button 
            onClick={() => {/* TODO: 全お知らせページへの遷移 */}}
            className="w-full text-center text-sm text-gray-600 hover:text-gray-700 transition-colors"
          >
{t('viewAll', { count: notifications.length })}
          </button>
        </div>
      )}
    </div>
  );
}