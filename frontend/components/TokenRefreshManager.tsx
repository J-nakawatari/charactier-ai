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
        // アクセストークンが2時間有効なので、1時間50分後（110分）にリフレッシュ
        // これにより、期限切れ前に確実にリフレッシュされる
        await refreshToken();
      } catch (error) {
        console.error('Token refresh check failed:', error);
      }
    };

    // 110分（1時間50分）ごとにリフレッシュを実行
    const REFRESH_INTERVAL = 110 * 60 * 1000; // 110分

    // 初回は30秒後に実行（ページロード直後は避ける）
    const initialTimeout = setTimeout(() => {
      checkAndRefresh();
      
      // その後は定期的に実行
      intervalRef.current = setInterval(checkAndRefresh, REFRESH_INTERVAL);
    }, 30000); // 30秒

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null;
}