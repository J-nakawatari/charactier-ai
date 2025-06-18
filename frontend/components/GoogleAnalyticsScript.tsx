'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

interface GoogleAnalyticsSettings {
  measurementId: string;
  trackingCode?: string;
  isActive: boolean;
}

export default function GoogleAnalyticsScript() {
  const [gaSettings, setGaSettings] = useState<GoogleAnalyticsSettings | null>(null);

  useEffect(() => {
    // Google Analytics設定を取得
    const fetchGASettings = async () => {
      try {
        console.log('Fetching GA settings...');
        const response = await fetch('/api/system-settings/google-analytics');
        console.log('GA settings response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('GA settings data:', data);
          
          if (data.isActive && data.settings) {
            setGaSettings({
              measurementId: data.settings.measurementId,
              trackingCode: data.settings.trackingCode,
              isActive: data.isActive
            });
            console.log('GA settings loaded:', data.settings.measurementId);
          }
        }
      } catch (error) {
        console.error('Failed to load GA settings:', error);
      }
    };

    fetchGASettings();
  }, []);

  // GA設定が無効またはロードされていない場合は何もレンダリングしない
  if (!gaSettings || !gaSettings.isActive || !gaSettings.measurementId) {
    console.log('GA script not rendered - settings:', gaSettings);
    return null;
  }

  console.log('Rendering GA script with measurement ID:', gaSettings.measurementId);

  // カスタムトラッキングコードがある場合はそれを使用
  if (gaSettings.trackingCode) {
    console.log('Using custom tracking code');
    return (
      <div dangerouslySetInnerHTML={{ __html: gaSettings.trackingCode }} />
    );
  }

  // デフォルトのGoogle Analyticsスクリプト
  console.log('Using default GA script');
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaSettings.measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaSettings.measurementId}');
        `}
      </Script>
    </>
  );
}

// 型定義を拡張
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}