'use client';

import React, { useState } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle, X, Eye, EyeOff } from 'lucide-react';

interface LocalizedString {
  ja: string;
  en: string;
}

interface Notification {
  _id: string;
  title: LocalizedString;
  message: LocalizedString;
  type: 'info' | 'warning' | 'success';
  isRead: boolean;
  createdAt: Date;
}

interface NotificationSectionProps {
  notifications: Notification[];
  locale: string;
}

export default function NotificationSection({ notifications, locale }: NotificationSectionProps) {
  const [localNotifications, setLocalNotifications] = useState(notifications);
  
  const unreadCount = localNotifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBgColor = (type: string, isRead: boolean) => {
    const alpha = isRead ? '50' : '100';
    switch (type) {
      case 'warning':
        return `bg-orange-${alpha} border-orange-200`;
      case 'success':
        return `bg-green-${alpha} border-green-200`;
      default:
        return `bg-blue-${alpha} border-blue-200`;
    }
  };

  const markAsRead = (notificationId: string) => {
    setLocalNotifications(prev => 
      prev.map(notification => 
        notification._id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setLocalNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (localNotifications.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Bell className="w-5 h-5 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">お知らせ</h3>
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
            お知らせ
            {unreadCount > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({unreadCount}件未読)
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
            <span>すべて既読</span>
          </button>
        )}
      </div>

      {/* 通知リスト */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {localNotifications.map((notification) => (
          <div
            key={notification._id}
            className={`p-4 rounded-lg border transition-all duration-200 ${
              getNotificationBgColor(notification.type, notification.isRead)
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
                        <span>既読</span>
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
      {localNotifications.length > 3 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button className="w-full text-center text-sm text-gray-600 hover:text-gray-700 transition-colors">
            すべてのお知らせを表示
          </button>
        </div>
      )}
    </div>
  );
}