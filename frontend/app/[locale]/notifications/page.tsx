'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, AlertCircle } from 'lucide-react';
import { authenticatedFetch } from '@/utils/auth';
import UserSidebar from '@/components/user/UserSidebar';
import { formatDistanceToNow } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface Notification {
  _id: string;
  title: { ja: string; en: string };
  message: { ja: string; en: string };
  type: 'info' | 'success' | 'warning' | 'error';
  isPinned: boolean;
  priority: number;
  isRead: boolean;
  isViewed: boolean;
  readAt?: string;
  viewedAt?: string;
  createdAt: string;
}

export default function NotificationsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [locale, setLocale] = useState<string>('ja');

  useEffect(() => {
    params.then(p => setLocale(p.locale || 'ja'));
  }, [params]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/notifications?limit=100');
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        console.error('Failed to fetch notifications:', response.status);
        toast.error('通知の取得に失敗しました');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('通知の取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await authenticatedFetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
            : notif
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        console.error('Failed to mark as read:', response.status);
        toast.error('既読にできませんでした');
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('エラーが発生しました');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await authenticatedFetch('/api/notifications/read-all', {
        method: 'POST'
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({
          ...notif,
          isRead: true,
          readAt: new Date().toISOString()
        })));
        setUnreadCount(0);
        toast.success('すべて既読にしました');
      } else {
        console.error('Failed to mark all as read:', response.status);
        toast.error('一括既読に失敗しました');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('エラーが発生しました');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <Check className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBgColor = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-gray-50';
    
    switch (type) {
      case 'error':
        return 'bg-red-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'success':
        return 'bg-green-50';
      default:
        return 'bg-blue-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <UserSidebar locale={locale} />
      
      <div className="flex-1 lg:ml-64">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ヘッダー */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {locale === 'ja' ? 'お知らせ' : 'Notifications'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {unreadCount > 0 
                    ? (locale === 'ja' ? `${unreadCount}件の未読` : `${unreadCount} unread`)
                    : (locale === 'ja' ? 'すべて既読です' : 'All read')
                  }
                </p>
              </div>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  {locale === 'ja' ? 'すべて既読にする' : 'Mark all as read'}
                </button>
              )}
            </div>
          </div>

          {/* 通知リスト */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {locale === 'ja' ? '通知はありません' : 'No notifications'}
              </h3>
              <p className="text-gray-500">
                {locale === 'ja' 
                  ? '新しいお知らせがあるとここに表示されます' 
                  : 'New notifications will appear here'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 rounded-lg transition-all cursor-pointer hover:shadow-md ${
                    getNotificationBgColor(notification.type, notification.isRead)
                  }`}
                  onClick={() => !notification.isRead && markAsRead(notification._id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className={`text-sm font-medium ${
                            notification.isRead ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {notification.title[locale as 'ja' | 'en']}
                            {notification.isPinned && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                {locale === 'ja' ? '重要' : 'Important'}
                              </span>
                            )}
                          </h3>
                          <p className={`text-sm mt-1 ${
                            notification.isRead ? 'text-gray-500' : 'text-gray-600'
                          }`}>
                            {notification.message[locale as 'ja' | 'en']}
                          </p>
                        </div>
                        
                        {!notification.isRead && (
                          <div className="flex-shrink-0">
                            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: locale === 'ja' ? ja : enUS
                          })}
                        </span>
                        {notification.isRead && notification.readAt && (
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            {locale === 'ja' ? '既読' : 'Read'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}