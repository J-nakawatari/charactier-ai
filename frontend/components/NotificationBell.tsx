'use client';

import { Bell } from 'lucide-react';
import { useNotificationStream } from '@/hooks/useNotificationStream';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const router = useRouter();
  const params = useParams();
  const { unreadCount, isConnected, requestNotificationPermission } = useNotificationStream();
  const locale = (params?.locale as string) || 'ja';

  useEffect(() => {
    // 通知権限をリクエスト
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  const handleClick = () => {
    // ダッシュボードに遷移
    router.push(`/${locale}/dashboard`);
  };

  return (
    <button
      onClick={handleClick}
      className={`relative p-2 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
      aria-label={`通知 ${unreadCount > 0 ? `(${unreadCount}件の未読)` : ''}`}
    >
      <Bell className="w-5 h-5 text-gray-600" />
      
      {/* 未読バッジ */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      
      {/* 接続状態インジケーター（開発時のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <span
          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-gray-400'
          }`}
          title={isConnected ? '通知接続中' : '通知未接続'}
        />
      )}
    </button>
  );
}