/**
 * Google Analytics gtag helper functions
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// GA測定IDを動的に取得
export const getGAMeasurementId = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // GA初期化スクリプトから測定IDを抽出
  const gaScript = document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
  if (gaScript) {
    const src = gaScript.getAttribute('src');
    const match = src?.match(/id=([^&]+)/);
    return match ? match[1] : null;
  }
  
  return null;
};

// ページビューを送信
export const pageview = (url: string) => {
  if (typeof window === 'undefined' || typeof window.gtag === 'undefined') return;
  
  const measurementId = getGAMeasurementId();
  if (!measurementId) return;
  
  window.gtag('config', measurementId, {
    page_path: url,
  });
};

// カスタムイベントを送信
export const event = (action: string, parameters?: Record<string, any>) => {
  if (typeof window === 'undefined' || typeof window.gtag === 'undefined') return;
  
  window.gtag('event', action, parameters);
};

// ユーザーIDを設定
export const setUserId = (userId: string | null) => {
  if (typeof window === 'undefined' || typeof window.gtag === 'undefined') return;
  
  const measurementId = getGAMeasurementId();
  if (!measurementId) return;
  
  if (userId) {
    // ユーザーIDを設定
    window.gtag('config', measurementId, {
      user_id: userId,
    });
    
    // ログインイベントも送信
    event('login', {
      method: 'jwt',
    });
  } else {
    // ユーザーIDをクリア（ログアウト時）
    window.gtag('config', measurementId, {
      user_id: undefined,
    });
    
    // ログアウトイベントも送信
    event('logout');
  }
};

// ユーザープロパティを設定
export const setUserProperties = (properties: Record<string, any>) => {
  if (typeof window === 'undefined' || typeof window.gtag === 'undefined') return;
  
  window.gtag('set', {
    user_properties: properties,
  });
};

// 購入イベント
export const purchase = (transactionData: {
  transaction_id: string;
  value: number;
  currency: string;
  items: Array<{
    item_id: string;
    item_name: string;
    item_category: string;
    price: number;
    quantity: number;
  }>;
}) => {
  event('purchase', transactionData);
};

// チャット開始イベント
export const chatStart = (characterId: string, characterName: string) => {
  event('chat_start', {
    character_id: characterId,
    character_name: characterName,
  });
};

// メッセージ送信イベント
export const messageSent = (characterId: string, messageLength: number) => {
  event('message_sent', {
    character_id: characterId,
    message_length: messageLength,
  });
};

// 親密度レベルアップイベント
export const affinityLevelUp = (characterId: string, level: number) => {
  event('affinity_level_up', {
    character_id: characterId,
    level: level,
  });
};