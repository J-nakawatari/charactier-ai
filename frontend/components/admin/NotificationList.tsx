'use client';

import { Bell, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  isRead: boolean;
  createdAt: string;
}

interface NotificationListProps {
  notifications: Notification[];
}

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'warning':
      return AlertTriangle;
    case 'error':
      return XCircle;
    default:
      return Info;
  }
};

const getColor = (type: string) => {
  switch (type) {
    case 'success':
      return 'text-green-500 bg-green-50';
    case 'warning':
      return 'text-yellow-500 bg-yellow-50';
    case 'error':
      return 'text-red-500 bg-red-50';
    default:
      return 'text-blue-500 bg-blue-50';
  }
};

export default function NotificationList({ notifications }: NotificationListProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">通知</h3>
        </div>
        <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
          すべて表示
        </button>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => {
          const Icon = getIcon(notification.type);
          const colorClass = getColor(notification.type);
          
          return (
            <div
              key={notification.id}
              className={`flex items-start space-x-3 p-4 rounded-lg border ${
                notification.isRead 
                  ? 'border-gray-100 bg-gray-50' 
                  : 'border-gray-200 bg-white'
              } hover:shadow-sm transition-shadow`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${
                    notification.isRead ? 'text-gray-600' : 'text-gray-900'
                  }`}>
                    {notification.title}
                  </h4>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {notification.message}
                </p>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    {new Date(notification.createdAt).toLocaleString('ja-JP', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  
                  {!notification.isRead && (
                    <button className="text-xs text-purple-600 hover:text-purple-700 font-medium">
                      既読にする
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <button className="w-full text-sm text-gray-600 hover:text-gray-700 py-2">
          すべての通知を表示
        </button>
      </div>
    </div>
  );
}