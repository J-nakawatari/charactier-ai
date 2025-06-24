'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import * as gtag from '@/lib/gtag';

/**
 * Google Analyticsクライアントサイドスクリプト
 * - SPAページ遷移の追跡
 * - ユーザー認証状態の監視
 * - user_idの自動設定
 */
export default function GoogleAnalyticsScript() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ページ遷移を追跡
  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      gtag.pageview(url);
    }
  }, [pathname, searchParams]);

  // ユーザー認証状態を監視
  useEffect(() => {
    const checkAuthState = () => {
      const user = localStorage.getItem('user');
      
      if (user) {
        try {
          const userData = JSON.parse(user);
          
          // ユーザーIDを設定（プライバシーのためハッシュ化を推奨）
          if (userData._id) {
            gtag.setUserId(userData._id);
            
            // ユーザープロパティも設定
            gtag.setUserProperties({
              user_type: userData.isAdmin ? 'admin' : 'user',
              has_setup_complete: userData.hasSetupComplete || false,
              locale: pathname?.split('/')[1] || 'ja',
            });
          }
        } catch (error) {
          console.error('Failed to parse user data:', error);
        }
      } else {
        // ログアウト状態
        gtag.setUserId(null);
      }
    };

    // 初回チェック
    checkAuthState();

    // localStorageの変更を監視
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        checkAuthState();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [pathname]);

  // GA初期化スクリプトの注入（SSRで出力されなかった場合のフォールバック）
  useEffect(() => {
    const checkAndInitGA = async () => {
      // 既にGAが初期化されているかチェック
      if (typeof window.gtag !== 'undefined') {
        return;
      }

      try {
        // GA設定を取得
        const response = await fetch('/api/v1/system-settings/google-analytics');
        if (!response.ok) return;

        const data = await response.json();
        if (!data.isActive || !data.settings?.measurementId) return;

        const measurementId = data.settings.measurementId;

        // GAスクリプトを動的に追加（フォールバック）
        const gtagScript = document.createElement('script');
        gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
        gtagScript.async = true;
        document.head.appendChild(gtagScript);

        // 初期化スクリプト
        const configScript = document.createElement('script');
        configScript.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname
          });
        `;
        document.head.appendChild(configScript);

        console.log('GA initialized as fallback');
      } catch (error) {
        console.error('Failed to initialize GA:', error);
      }
    };

    // 少し遅延させて実行（SSRの後に実行されるように）
    const timer = setTimeout(checkAndInitGA, 100);

    return () => clearTimeout(timer);
  }, []);

  return null;
}