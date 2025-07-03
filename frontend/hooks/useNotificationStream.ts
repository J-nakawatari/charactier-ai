'use client';

import { useEffect, useState, useCallback } from 'react';
import { authenticatedFetch } from '@/utils/auth';

interface NotificationEvent {
  type: 'unreadCount' | 'newNotification' | 'markAsRead';
  count?: number;
  notification?: {
    id: string;
    title: { ja: string; en: string };
    type: string;
  };
  notificationId?: string;
  unreadCount?: number;
}

export function useNotificationStream() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastNotification, setLastNotification] = useState<NotificationEvent['notification'] | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let connectionStartTime: number = 0;

    const connect = async () => {
      try {
        // 接続開始時刻を記録
        connectionStartTime = Date.now();
        
        // EventSourceはCookieを自動的に送るので、認証はCookieベースで行われる
        // フロントエンドプロキシ経由で接続（CSP対策）
        eventSource = new EventSource(`/api/v1/notifications/stream`, {
          withCredentials: true // Cookieを送信
        });

        eventSource.onopen = () => {
          console.log('✅ Notification stream connected');
          setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data: NotificationEvent = JSON.parse(event.data);
            
            switch (data.type) {
              case 'unreadCount':
                setUnreadCount(data.count || 0);
                break;
              
              case 'newNotification':
                // 新しい通知が来たら未読数を増やす
                setUnreadCount(prev => prev + 1);
                setLastNotification(data.notification || null);
                
                // 通知音を鳴らす（オプション）
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('新しいお知らせ', {
                    body: data.notification?.title.ja || '新しいお知らせがあります',
                    icon: '/icon-192x192.png'
                  });
                }
                break;
              
              case 'markAsRead':
                // 既読にしたら未読数を更新
                setUnreadCount(data.unreadCount || 0);
                break;
            }
          } catch (error) {
            console.error('❌ Error parsing notification event:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('❌ Notification stream error:', error);
          setIsConnected(false);
          eventSource?.close();
          
          // 401エラーの場合は再接続しない（認証が無効）
          const timeSinceConnect = Date.now() - connectionStartTime;
          const isAuthError = timeSinceConnect < 1000; // 1秒以内にエラーは認証エラーの可能性が高い
          
          if (isAuthError) {
            console.log('🔐 Authentication error detected, stopping reconnection');
            return; // 再接続しない
          }
          
          // 5秒後に再接続を試みる
          reconnectTimeout = setTimeout(() => {
            console.log('🔄 Attempting to reconnect notification stream...');
            connect();
          }, 5000);
        };

      } catch (error) {
        console.error('❌ Failed to connect notification stream:', error);
        setIsConnected(false);
      }
    };

    connect();

    // クリーンアップ
    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // 通知権限をリクエスト
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  // 未読カウントをリセット
  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return {
    unreadCount,
    isConnected,
    lastNotification,
    requestNotificationPermission,
    resetUnreadCount
  };
}