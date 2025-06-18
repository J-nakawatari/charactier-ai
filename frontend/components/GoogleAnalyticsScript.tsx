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
        
        if (response.ok) {
          const data = await response.json();
          console.log('GA settings response:', data);
          
          if (data.isActive && data.settings) {
            setGaSettings({
              measurementId: data.settings.measurementId,
              trackingCode: data.settings.trackingCode,
              isActive: data.isActive
            });
            console.log('GA settings loaded:', data.settings.measurementId);
          } else {
            console.log('GA is not active or settings are missing');
          }
        } else {
          console.error('Failed to fetch GA settings:', response.status);
        }
      } catch (error) {
        console.error('Failed to load GA settings:', error);
      }
    };

    fetchGASettings();
  }, []);

  // カスタムトラッキングコードがある場合はそれを使用
  useEffect(() => {
    if (gaSettings && gaSettings.trackingCode && typeof window !== 'undefined') {
      console.log('Injecting custom GA tracking code...');
      
      // 既存のGAスクリプトをチェック
      const existingGAScript = document.getElementById('ga-custom-script');
      if (existingGAScript) {
        console.log('GA script already exists, skipping...');
        return;
      }

      // 一時的なdiv要素を作成してHTMLをパース
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = gaSettings.trackingCode;
      
      // script要素を抽出して実行
      const scripts = tempDiv.getElementsByTagName('script');
      const addedScripts: HTMLScriptElement[] = [];
      
      Array.from(scripts).forEach((script, index) => {
        const newScript = document.createElement('script');
        newScript.id = index === 0 ? 'ga-custom-script' : `ga-custom-script-${index}`;
        
        // 属性をコピー
        Array.from(script.attributes).forEach((attr) => {
          if (attr.name !== 'id') {
            newScript.setAttribute(attr.name, attr.value);
          }
        });
        
        // スクリプト内容をコピー
        if (script.innerHTML) {
          newScript.innerHTML = script.innerHTML;
        }
        
        // headに追加
        document.head.appendChild(newScript);
        addedScripts.push(newScript);
        console.log(`Added GA script ${index}:`, newScript.id);
      });
      
      console.log(`Successfully injected ${addedScripts.length} GA scripts`);

      // クリーンアップ関数
      return () => {
        addedScripts.forEach(script => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        });
      };
    }
  }, [gaSettings]);

  // GA設定が無効またはロードされていない場合は何もレンダリングしない
  if (!gaSettings || !gaSettings.isActive || !gaSettings.measurementId) {
    return null;
  }

  if (gaSettings && gaSettings.trackingCode) {
    // カスタムコードの場合は何も返さない（useEffectで処理）
    return null;
  }

  // デフォルトのGoogle Analyticsスクリプト
  console.log('Rendering default GA script with ID:', gaSettings.measurementId);
  
  return (
    <>
      <Script
        id="google-analytics-gtag"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaSettings.measurementId}`}
        strategy="afterInteractive"
        onLoad={() => console.log('GA gtag.js loaded')}
        onError={(e) => console.error('GA gtag.js failed to load:', e)}
      />
      <Script
        id="google-analytics-config"
        strategy="afterInteractive"
        onReady={() => console.log('GA config script ready')}
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaSettings.measurementId}');
          `
        }}
      />
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