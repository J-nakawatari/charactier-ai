'use client';

import { useEffect, useState } from 'react';
import { getGAMeasurementId } from '@/lib/gtag';

/**
 * Google Analyticsデバッグコンポーネント
 * 開発環境でGAの動作状況を確認
 */
export default function GADebugger() {
  const [debugInfo, setDebugInfo] = useState({
    measurementId: null as string | null,
    gtagAvailable: false,
    dataLayerCount: 0,
    userId: null as string | null,
  });

  useEffect(() => {
    const updateDebugInfo = () => {
      const user = localStorage.getItem('user');
      let userId = null;
      
      if (user) {
        try {
          const userData = JSON.parse(user);
          userId = userData._id;
        } catch (e) {
          // ignore
        }
      }

      setDebugInfo({
        measurementId: getGAMeasurementId(),
        gtagAvailable: typeof window.gtag === 'function',
        dataLayerCount: window.dataLayer?.length || 0,
        userId: userId,
      });
    };

    // 初回更新
    updateDebugInfo();

    // 定期的に更新
    const interval = setInterval(updateDebugInfo, 2000);

    return () => clearInterval(interval);
  }, []);

  // 本番環境では表示しない
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono max-w-xs">
      <div className="font-bold mb-2">GA Debug Info</div>
      <div>Measurement ID: {debugInfo.measurementId || 'Not found'}</div>
      <div>gtag: {debugInfo.gtagAvailable ? '✅ Available' : '❌ Not available'}</div>
      <div>DataLayer Events: {debugInfo.dataLayerCount}</div>
      <div>User ID: {debugInfo.userId ? `✅ ${debugInfo.userId.slice(0, 8)}...` : '❌ Not set'}</div>
    </div>
  );
}