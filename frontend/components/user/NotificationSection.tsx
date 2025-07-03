'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle, AlertCircle, Wrench, Star, Gift } from 'lucide-react';
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
  createdAt: string;
  validFrom: string;
  validUntil?: string;
}

interface NotificationSectionProps {
  locale: string;
}

export default function NotificationSection({ locale }: NotificationSectionProps) {
  const t = useTranslations('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // お知らせデータ取得
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/v1/notifications?limit=10', {
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

  const getNotificationBgColor = (type: string) => {
    return 'bg-white border-gray-200';
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
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          {t('title')}
        </h3>
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
                getNotificationBgColor(notification.type)
              }`}
            >
              <div className="flex items-start space-x-3">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900">
                      {notification.title[locale as keyof LocalizedString]}
                    </h4>
                    {notification.isPinned && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {t('important')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {notification.message[locale as keyof LocalizedString]}
                  </p>
                  <span className="text-xs text-gray-400 mt-2 block">
                    {formatDate(notification.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>

    </div>
  );
}