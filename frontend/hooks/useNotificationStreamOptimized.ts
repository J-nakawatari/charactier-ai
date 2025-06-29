'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { authenticatedFetch } from '@/utils/auth';

// SSR対策: windowオブジェクトが存在しない環境での実行を防ぐ
if (typeof window === 'undefined') {
  // サーバーサイドでは何もしないダミー関数を返す
  const dummyHook = () => ({
    unreadCount: 0,
    isConnected: false,
    connectionState: { status: 'disconnected' as const, retryCount: 0 },
    lastNotification: null,
    requestNotificationPermission: async () => false,
    reconnect: () => {}
  });
  
  // エクスポート名を維持
  module.exports = { useNotificationStreamOptimized: dummyHook };
}

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

interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
  retryCount: number;
  lastError?: string;
}

export function useNotificationStreamOptimized() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    retryCount: 0
  });
  const [lastNotification, setLastNotification] = useState<NotificationEvent['notification'] | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  // 最大リトライ回数とバックオフ設定
  const MAX_RETRY_COUNT = 10;
  const INITIAL_RETRY_DELAY = 1000; // 1秒
  const MAX_RETRY_DELAY = 60000; // 60秒
  const BACKOFF_MULTIPLIER = 2;
  const JITTER_FACTOR = 0.3; // 30%のジッター

  // バックオフ遅延時間の計算
  const calculateBackoffDelay = useCallback((retryCount: number): number => {
    // エクスポネンシャルバックオフ
    const exponentialDelay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(BACKOFF_MULTIPLIER, retryCount),
      MAX_RETRY_DELAY
    );
    
    // ジッターを追加（サーバーへの同時接続を防ぐ）
    const jitter = exponentialDelay * JITTER_FACTOR * Math.random();
    
    return Math.floor(exponentialDelay + jitter);
  }, []);

  const connect = useCallback(async () => {
    // 既存の接続をクリーンアップ
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // 最大リトライ回数を超えた場合
    if (retryCountRef.current >= MAX_RETRY_COUNT) {
      setConnectionState({
        status: 'failed',
        retryCount: retryCountRef.current,
        lastError: 'Maximum retry attempts reached'
      });
      console.error('❌ Maximum retry attempts reached for notification stream');
      return;
    }

    setConnectionState(prev => ({
      ...prev,
      status: 'connecting'
    }));

    try {
      // EventSourceはCookieを自動的に送るので、認証はCookieベースで行われる
      eventSourceRef.current = new EventSource(`/api/v1/notifications/stream`, {
        withCredentials: true
      });

      eventSourceRef.current.onopen = () => {
        console.log('✅ Notification stream connected');
        retryCountRef.current = 0; // リトライカウントをリセット
        setConnectionState({
          status: 'connected',
          retryCount: 0
        });
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          // ハートビートメッセージを無視
          if (event.data === ':heartbeat') {
            return;
          }

          const data: NotificationEvent = JSON.parse(event.data);
          
          switch (data.type) {
            case 'unreadCount':
              setUnreadCount(data.count || 0);
              break;
            
            case 'newNotification':
              setUnreadCount(prev => prev + 1);
              setLastNotification(data.notification || null);
              
              // ブラウザ通知（権限がある場合のみ）
              if ('Notification' in window && 
                  Notification.permission === 'granted' && 
                  document.hidden) { // バックグラウンドタブの場合のみ
                new Notification('新しいお知らせ', {
                  body: data.notification?.title.ja || '新しいお知らせがあります',
                  icon: '/icon-192x192.png',
                  tag: 'charactier-notification', // 同じタグで通知を置き換える
                  requireInteraction: false
                });
              }
              break;
            
            case 'markAsRead':
              setUnreadCount(data.unreadCount || 0);
              break;
          }
        } catch (error) {
          console.error('❌ Error parsing notification event:', error);
        }
      };

      eventSourceRef.current.onerror = (error) => {
        console.error('❌ Notification stream error:', error);
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
        
        setConnectionState(prev => ({
          status: 'disconnected',
          retryCount: retryCountRef.current,
          lastError: 'Connection lost'
        }));

        // 再接続の準備
        retryCountRef.current += 1;
        const delay = calculateBackoffDelay(retryCountRef.current);
        
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRY_COUNT})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

    } catch (error) {
      console.error('❌ Failed to connect notification stream:', error);
      setConnectionState({
        status: 'disconnected',
        retryCount: retryCountRef.current,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // 接続エラーの場合も再接続
      retryCountRef.current += 1;
      const delay = calculateBackoffDelay(retryCountRef.current);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    }
  }, [calculateBackoffDelay]);

  // 手動での再接続
  const reconnect = useCallback(() => {
    retryCountRef.current = 0; // リトライカウントをリセット
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    connect();
  }, [connect]);

  // ページ表示/非表示の検出
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && connectionState.status === 'failed') {
        // ページが表示された時、失敗状態なら再接続を試みる
        console.log('📱 Page became visible, attempting reconnection...');
        reconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connectionState.status, reconnect]);

  // オンライン/オフラインの検出
  useEffect(() => {
    const handleOnline = () => {
      if (connectionState.status !== 'connected') {
        console.log('🌐 Network came online, attempting reconnection...');
        reconnect();
      }
    };

    const handleOffline = () => {
      console.log('📵 Network went offline');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionState.status, reconnect]);

  // 初回接続
  useEffect(() => {
    // SSR環境では実行しない
    if (typeof window === 'undefined') return;
    
    connect();

    // クリーンアップ（ページ離脱時に確実にリソースを解放）
    return () => {
      // 接続を明示的に閉じる
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // タイマーをクリア
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // 再接続カウントをリセット
      retryCountRef.current = 0;
    };
  }, [connect]);

  // 通知権限をリクエスト
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  return {
    unreadCount,
    isConnected: connectionState.status === 'connected',
    connectionState,
    lastNotification,
    requestNotificationPermission,
    reconnect
  };
}