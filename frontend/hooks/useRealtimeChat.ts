'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface RealtimeChatState {
  isTyping: boolean;
  isUserTyping: boolean;
  isCharacterTyping: boolean;
  lastActivity: Date | null;
}

export interface RealtimeChatActions {
  startTyping: () => void;
  stopTyping: () => void;
  setCharacterTyping: (typing: boolean) => void;
  updateActivity: () => void;
}

/**
 * リアルタイムチャット状態管理フック
 */
export function useRealtimeChat(characterId: string): RealtimeChatState & RealtimeChatActions {
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [isCharacterTyping, setIsCharacterTyping] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // アクティビティ更新
  const updateActivity = useCallback(() => {
    setLastActivity(new Date());
    
    // アクティビティタイムアウトをリセット
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    
    // 10分後にアクティビティをクリア
    activityTimeoutRef.current = setTimeout(() => {
      setLastActivity(null);
    }, 10 * 60 * 1000);
  }, []);

  // ユーザーのタイピング開始
  const startTyping = useCallback(() => {
    setIsUserTyping(true);
    updateActivity();
    
    // 既存のタイムアウトをクリア
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // 3秒後にタイピング状態を停止
    typingTimeoutRef.current = setTimeout(() => {
      setIsUserTyping(false);
    }, 3000);
  }, [updateActivity]);

  // ユーザーのタイピング停止
  const stopTyping = useCallback(() => {
    setIsUserTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  // キャラクターのタイピング状態設定
  const setCharacterTyping = useCallback((typing: boolean) => {
    setIsCharacterTyping(typing);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    isTyping: isUserTyping || isCharacterTyping,
    isUserTyping,
    isCharacterTyping,
    lastActivity,
    
    // Actions
    startTyping,
    stopTyping,
    setCharacterTyping,
    updateActivity
  };
}

/**
 * メッセージ入力のデバウンス管理フック
 */
export function useTypingDebounce(
  onStartTyping: () => void,
  onStopTyping: () => void,
  debounceMs = 1000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onStartTyping();
    }

    // 既存のタイムアウトをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // デバウンス後にタイピング停止
    timeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onStopTyping();
    }, debounceMs);
  }, [onStartTyping, onStopTyping, debounceMs]);

  const stopTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onStopTyping();
    }
  }, [onStopTyping]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { handleTyping, stopTyping };
}

/**
 * チャット接続状態管理フック
 */
export function useChatConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [lastPing, setLastPing] = useState<number | null>(null);

  // 接続品質チェック
  const checkConnectionQuality = useCallback(async () => {
    try {
      const startTime = Date.now();
      const response = await fetch('/api/ping', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const pingTime = Date.now() - startTime;
      
      setLastPing(pingTime);
      setIsConnected(response.ok);
      
      if (response.ok) {
        if (pingTime < 500) {
          setConnectionQuality('good');
        } else if (pingTime < 2000) {
          setConnectionQuality('poor');
        } else {
          setConnectionQuality('poor');
        }
      } else {
        setConnectionQuality('offline');
      }
    } catch (error) {
      setIsConnected(false);
      setConnectionQuality('offline');
      setLastPing(null);
    }
  }, []);

  // 定期的な接続チェック
  useEffect(() => {
    checkConnectionQuality();
    const interval = setInterval(checkConnectionQuality, 60000); // 60秒間隔に延長してサーバー負荷を軽減

    return () => clearInterval(interval);
  }, [checkConnectionQuality]);

  // オンライン/オフライン状態の監視
  useEffect(() => {
    const handleOnline = () => {
      setIsConnected(true);
      checkConnectionQuality();
    };
    
    const handleOffline = () => {
      setIsConnected(false);
      setConnectionQuality('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnectionQuality]);

  return {
    isConnected,
    connectionQuality,
    lastPing,
    checkConnection: checkConnectionQuality
  };
}