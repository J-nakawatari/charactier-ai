'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { getAuthHeadersSync } from '@/utils/auth';

// キャッシュキー定数
export const DASHBOARD_CACHE_KEYS = {
  USER_DASHBOARD: '/api/v1/user/dashboard',
  ADMIN_OVERVIEW: '/api/v1/admin/token-analytics/overview',
  ADMIN_USERS: '/api/v1/admin/users',
  ADMIN_CHARACTERS: '/api/v1/admin/characters',
  ADMIN_ERROR_STATS: '/api/v1/admin/error-stats',
  ADMIN_DASHBOARD_STATS: '/api/v1/admin/dashboard/stats',
  ADMIN_NOTIFICATIONS: '/api/v1/admin/notifications'
} as const;

// SWRの設定（リクエスト削減版）
const SWR_CONFIG: SWRConfiguration = {
  // キャッシュ有効期間（大幅に短縮してリクエスト頻度を下げる）
  dedupingInterval: 10000, // 10秒間は同じリクエストを重複排除
  focusThrottleInterval: 300000, // フォーカス時の再検証を5分に1回に制限
  
  // 自動再検証設定（リクエスト削減のため無効化）
  revalidateOnFocus: false, // ウィンドウフォーカス時の再検証を無効化
  revalidateOnReconnect: true, // ネットワーク再接続時のみ再検証
  revalidateIfStale: false, // 古いデータでも再検証しない
  
  // エラーハンドリング（リトライを制限）
  errorRetryCount: 1, // エラー時のリトライを1回に制限
  errorRetryInterval: 5000, // エラー時のリトライ間隔
  shouldRetryOnError: true, // エラー時の自動リトライは有効（ただし1回のみ）
  
  // パフォーマンス設定
  keepPreviousData: true, // 新しいデータ取得中も前のデータを保持
  fallbackData: undefined, // 初期表示用のフォールバックデータ
  
  // ローディング状態
  loadingTimeout: 10000, // 10秒でタイムアウト
  
  // オフライン対応
  provider: () => new Map() // メモリベースのキャッシュプロバイダー
};

// 管理者用のSWR設定（より緩和されたバージョン）
const ADMIN_SWR_CONFIG: SWRConfiguration = {
  // キャッシュ有効期間
  dedupingInterval: 30000, // 30秒間は同じリクエストを重複排除
  focusThrottleInterval: 600000, // フォーカス時の再検証を10分に1回に制限
  
  // 自動再検証設定
  revalidateOnFocus: false, // ウィンドウフォーカス時の再検証を無効化
  revalidateOnReconnect: true, // ネットワーク再接続時のみ再検証
  revalidateIfStale: false, // 古いデータでも再検証しない
  
  // エラーハンドリング
  errorRetryCount: 2, // エラー時のリトライを2回まで
  errorRetryInterval: 10000, // エラー時のリトライ間隔を10秒に
  shouldRetryOnError: true, // エラー時の自動リトライは有効
  
  // パフォーマンス設定
  keepPreviousData: true, // 新しいデータ取得中も前のデータを保持
  fallbackData: undefined, // 初期表示用のフォールバックデータ
  
  // ローディング状態
  loadingTimeout: 30000, // 30秒でタイムアウト
  
  // オフライン対応
  provider: () => new Map() // メモリベースのキャッシュプロバイダー
};

// 共通のfetcher関数
const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: getAuthHeadersSync(),
    cache: 'no-store' // ブラウザキャッシュは使用しない（SWRが管理）
  });

  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.');
    (error as any).info = await response.json();
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
};

// 機密情報を除外してキャッシュ用データを生成
const sanitizeDataForCache = (data: any): any => {
  if (!data) return data;
  
  // ユーザーダッシュボードデータの場合
  if (data.user) {
    const sanitized = {
      ...data,
      user: {
        ...data.user,
        // 機密情報を除外
        email: undefined,
        phone: undefined,
        address: undefined,
        creditCard: undefined,
        // 統計情報のみ保持
        tokenBalance: data.user.tokenBalance,
        totalChats: data.user.totalChats,
        purchasedCharacters: data.user.purchasedCharacters?.length || 0, // IDは保存しない
        name: data.user.name
      }
    };
    
    // 詳細な通知情報を除外（件数のみ保持）
    if (data.notifications) {
      sanitized.notificationCount = Array.isArray(data.notifications) ? data.notifications.length : 0;
      sanitized.notifications = undefined;
    }
    
    // チャット履歴の詳細を除外（最新日時のみ保持）
    if (data.recentChats) {
      sanitized.recentChatCount = data.recentChats.length;
      sanitized.lastChatDate = data.recentChats[0]?.updatedAt;
      sanitized.recentChats = data.recentChats.map((chat: any) => ({
        characterId: chat.character?._id,
        characterName: chat.character?.name,
        updatedAt: chat.updatedAt
      }));
    }
    
    return sanitized;
  }
  
  // 管理者データの場合
  if (data.overview || data.users || data.characters) {
    return {
      // 統計情報のみ保持
      overviewStats: data.overview ? {
        totalRevenue: data.overview.totalRevenue,
        totalUsers: data.overview.totalUsers,
        activeUsers: data.overview.activeUsers
      } : undefined,
      userCount: data.users?.length || 0,
      characterCount: data.characters?.length || 0,
      // 詳細情報は除外
      users: undefined,
      characters: undefined,
      notifications: undefined,
      detailNotifications: undefined
    };
  }
  
  return data;
};

// ユーザーダッシュボード用フック
export function useUserDashboard() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    DASHBOARD_CACHE_KEYS.USER_DASHBOARD,
    fetcher,
    {
      ...SWR_CONFIG,
      refreshInterval: 300000, // 5分ごとに自動更新
      
      // ローカルストレージキャッシュ
      onSuccess: (data) => {
        // 成功時にローカルストレージに保存（機密情報を除外）
        if (typeof window !== 'undefined') {
          const sanitizedData = sanitizeDataForCache(data);
          localStorage.setItem('dashboardCache', JSON.stringify({
            data: sanitizedData,
            timestamp: Date.now()
          }));
        }
      },
      
      // 初期データとしてローカルストレージから読み込み
      fallbackData: (() => {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('dashboardCache');
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            // 1時間以内のキャッシュは有効とする
            if (Date.now() - timestamp < 3600000) {
              return data;
            }
          }
        }
        return undefined;
      })()
    }
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    refresh: () => mutate()
  };
}

// 管理者ダッシュボード用フック
export function useAdminDashboard() {
  // 複数のエンドポイントを並列で取得（管理者用の緩和された設定を使用）
  const overview = useSWR(DASHBOARD_CACHE_KEYS.ADMIN_OVERVIEW, fetcher, ADMIN_SWR_CONFIG);
  const users = useSWR(DASHBOARD_CACHE_KEYS.ADMIN_USERS, fetcher, ADMIN_SWR_CONFIG);
  const characters = useSWR(DASHBOARD_CACHE_KEYS.ADMIN_CHARACTERS, fetcher, ADMIN_SWR_CONFIG);
  const errorStats = useSWR(
    `${DASHBOARD_CACHE_KEYS.ADMIN_ERROR_STATS}?range=all`,
    fetcher,
    ADMIN_SWR_CONFIG
  );
  const dashboardStats = useSWR(DASHBOARD_CACHE_KEYS.ADMIN_DASHBOARD_STATS, fetcher, ADMIN_SWR_CONFIG);
  const notifications = useSWR(
    `${DASHBOARD_CACHE_KEYS.ADMIN_NOTIFICATIONS}?limit=5`,
    fetcher,
    ADMIN_SWR_CONFIG
  );

  // すべてのデータの読み込み状態を集約
  const isLoading = overview.isLoading || users.isLoading || characters.isLoading || 
                    errorStats.isLoading || dashboardStats.isLoading || notifications.isLoading;
  
  const isValidating = overview.isValidating || users.isValidating || characters.isValidating ||
                      errorStats.isValidating || dashboardStats.isValidating || notifications.isValidating;
  
  const hasError = overview.error || users.error || characters.error || 
                   errorStats.error || dashboardStats.error || notifications.error;

  // すべてのデータを更新
  const refreshAll = () => {
    overview.mutate();
    users.mutate();
    characters.mutate();
    errorStats.mutate();
    dashboardStats.mutate();
    notifications.mutate();
  };

  return {
    data: {
      overview: overview.data,
      users: users.data?.users || [],
      characters: characters.data?.characters || [],
      errorStats: errorStats.data,
      dashboardStats: dashboardStats.data,
      notifications: notifications.data?.notifications || []
    },
    isLoading,
    isValidating,
    hasError,
    errors: {
      overview: overview.error,
      users: users.error,
      characters: characters.error,
      errorStats: errorStats.error,
      dashboardStats: dashboardStats.error,
      notifications: notifications.error
    },
    refresh: refreshAll
  };
}

// キャッシュをクリアするユーティリティ関数
export function clearDashboardCache() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dashboardCache');
    // SWRのキャッシュもクリア
    Object.values(DASHBOARD_CACHE_KEYS).forEach(key => {
      (window as any).swr?.cache?.delete(key);
    });
  }
}

// 特定のデータのみを再検証するユーティリティ
export function revalidateDashboardData(key: keyof typeof DASHBOARD_CACHE_KEYS) {
  if (typeof window !== 'undefined' && (window as any).swr?.mutate) {
    (window as any).swr.mutate(DASHBOARD_CACHE_KEYS[key]);
  }
}