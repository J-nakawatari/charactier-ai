'use client';

import { useEffect, useRef } from 'react';
import { refreshToken } from '@/utils/auth';

/**
 * トークンリフレッシュマネージャー
 * アクセストークンの有効期限前に自動的にリフレッシュを実行
 */
export default function TokenRefreshManager() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 初回チェック
    const checkAndRefresh = async () => {
      try {
        console.log('[TokenRefreshManager] Starting token refresh...');
        const result = await refreshToken();
        if (result.success) {
          console.log('[TokenRefreshManager] Token refresh successful');
        } else {
          console.error('[TokenRefreshManager] Token refresh failed:', result.error);
        }
      } catch (error) {
        console.error('[TokenRefreshManager] Token refresh error:', error);
      }
    };

    // 50分ごとにリフレッシュを実行（アクセストークンが2時間有効なので、余裕を持って）
    const REFRESH_INTERVAL = 50 * 60 * 1000; // 50分

    // 初回は5分後に実行（ページロード直後の負荷を避けつつ、早めにチェック）
    const initialTimeout = setTimeout(() => {
      checkAndRefresh();
      
      // その後は定期的に実行
      intervalRef.current = setInterval(checkAndRefresh, REFRESH_INTERVAL);
    }, 5 * 60 * 1000); // 5分

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null;
}