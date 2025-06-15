// API設定 - 本番環境対応
export const getApiUrl = (): string => {
  // 環境変数が設定されている場合はそれを使用
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // ブラウザ環境でのフォールバック
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // 本番ドメインの場合
    if (origin.includes('charactier-ai.com')) {
      return 'https://charactier-ai.com:5000';
    }
  }
  
  // 開発環境のデフォルト
  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiUrl();