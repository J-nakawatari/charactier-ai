// API設定 - 本番環境対応
export const getApiUrl = (): string => {
  // 環境変数が設定されている場合はそれを使用
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // ブラウザ環境でのフォールバック
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // 本番ドメインの場合 - Nginxプロキシを使用
    // 厳密なドメイン検証を行う
    const url = new URL(origin);
    if (url.hostname === 'charactier-ai.com' || url.hostname === 'www.charactier-ai.com') {
      return 'https://charactier-ai.com';
    }
    
    // ステージング環境の場合
    if (url.hostname === 'staging.charactier-ai.com') {
      return 'https://staging.charactier-ai.com';
    }
  }
  
  // 開発環境のデフォルト
  return 'http://localhost:5000';
};

// API_BASE_URLを動的に取得する関数
export const getApiBaseUrl = (): string => {
  return getApiUrl();
};

// 後方互換性のため、既存のAPI_BASE_URL変数も残す（ビルド時は空文字列）
export const API_BASE_URL = '';