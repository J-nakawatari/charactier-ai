/**
 * 管理画面の自動更新設定
 * 
 * 各画面に適した更新間隔を定義し、システム負荷と情報の鮮度のバランスを取る
 */

import { useEffect, useRef } from 'react';

export interface AutoRefreshConfig {
  interval: number; // ミリ秒
  enabled: boolean;
  minInterval: number; // 最小間隔（ミリ秒）
  maxInterval: number; // 最大間隔（ミリ秒）
  description: string;
}

export const AUTO_REFRESH_CONFIGS: Record<string, AutoRefreshConfig> = {
  // サーバーヘルス監視
  serverHealth: {
    interval: 5 * 60 * 1000, // 5分
    enabled: true,
    minInterval: 60 * 1000, // 最小1分
    maxInterval: 10 * 60 * 1000, // 最大10分
    description: 'サーバーの健康状態を監視'
  },

  // キャラクター統計
  characterStats: {
    interval: 60 * 60 * 1000, // 1時間
    enabled: true,
    minInterval: 30 * 60 * 1000, // 最小30分
    maxInterval: 2 * 60 * 60 * 1000, // 最大2時間
    description: 'キャラクター利用統計の更新'
  },

  // エラー監視（新規追加提案）
  errorMonitoring: {
    interval: 2 * 60 * 1000, // 2分
    enabled: false, // デフォルトは無効（手動で有効化）
    minInterval: 30 * 1000, // 最小30秒
    maxInterval: 5 * 60 * 1000, // 最大5分
    description: '重要なエラーを素早く検知'
  },

  // ダッシュボード概要（新規追加提案）
  dashboardOverview: {
    interval: 10 * 60 * 1000, // 10分
    enabled: false, // デフォルトは無効
    minInterval: 5 * 60 * 1000, // 最小5分
    maxInterval: 30 * 60 * 1000, // 最大30分
    description: 'ダッシュボード全体の統計更新'
  },

  // 為替レート
  exchangeRate: {
    interval: 30 * 60 * 1000, // 30分
    enabled: false, // デフォルトは無効（APIコスト考慮）
    minInterval: 15 * 60 * 1000, // 最小15分
    maxInterval: 60 * 60 * 1000, // 最大1時間
    description: 'USD/JPY為替レートの更新'
  },

  // システムモニタリング
  systemMonitoring: {
    interval: 60 * 1000, // 1分
    enabled: false, // デフォルトは無効（負荷が高い）
    minInterval: 30 * 1000, // 最小30秒
    maxInterval: 5 * 60 * 1000, // 最大5分
    description: 'リアルタイムシステム監視'
  }
};

/**
 * 動的な更新間隔の調整
 * エラー率や負荷に応じて更新間隔を自動調整
 */
export class DynamicRefreshManager {
  private config: AutoRefreshConfig;
  private currentInterval: number;
  private errorCount: number = 0;
  private successCount: number = 0;
  private lastUpdate: number = Date.now();

  constructor(configKey: keyof typeof AUTO_REFRESH_CONFIGS) {
    this.config = AUTO_REFRESH_CONFIGS[configKey];
    this.currentInterval = this.config.interval;
  }

  /**
   * 成功時の処理
   */
  onSuccess() {
    this.successCount++;
    this.errorCount = 0; // エラーカウントをリセット

    // 10回連続成功したら間隔を少し長くする（負荷軽減）
    if (this.successCount >= 10) {
      this.currentInterval = Math.min(
        this.currentInterval * 1.1,
        this.config.maxInterval
      );
      this.successCount = 0;
    }
  }

  /**
   * エラー時の処理
   */
  onError() {
    this.errorCount++;
    
    // 3回連続エラーなら間隔を長くする（サーバー保護）
    if (this.errorCount >= 3) {
      this.currentInterval = Math.min(
        this.currentInterval * 2,
        this.config.maxInterval
      );
    }
  }

  /**
   * 重要なイベント発生時（エラー急増など）
   */
  onCriticalEvent() {
    // 間隔を最小値に設定（迅速な監視）
    this.currentInterval = this.config.minInterval;
    this.errorCount = 0;
    this.successCount = 0;
  }

  /**
   * 現在の更新間隔を取得
   */
  getCurrentInterval(): number {
    return this.currentInterval;
  }

  /**
   * 次の更新時刻を取得
   */
  getNextUpdateTime(): Date {
    return new Date(this.lastUpdate + this.currentInterval);
  }

  /**
   * 更新を実行
   */
  markUpdate() {
    this.lastUpdate = Date.now();
  }

  /**
   * 設定を取得
   */
  getConfig(): AutoRefreshConfig {
    return this.config;
  }
}

/**
 * ユーザーの活動状態に基づく更新制御
 */
export class ActivityBasedRefresh {
  private lastActivity: number = Date.now();
  private isActive: boolean = true;
  private inactivityThreshold: number = 5 * 60 * 1000; // 5分

  constructor() {
    if (typeof window !== 'undefined') {
      // ユーザーアクティビティを監視
      ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
        window.addEventListener(event, () => this.updateActivity(), { passive: true });
      });

      // ページ表示状態を監視
      document.addEventListener('visibilitychange', () => {
        this.isActive = !document.hidden;
      });
    }
  }

  private updateActivity() {
    this.lastActivity = Date.now();
  }

  /**
   * 更新を実行すべきかどうかを判定
   */
  shouldUpdate(baseInterval: number): boolean {
    // ページが非表示の場合は更新しない
    if (!this.isActive) return false;

    // 非アクティブ時間を計算
    const inactiveTime = Date.now() - this.lastActivity;
    
    // 長時間非アクティブの場合は更新頻度を下げる
    if (inactiveTime > this.inactivityThreshold) {
      // 非アクティブ時間に応じて更新間隔を延長
      const factor = Math.min(inactiveTime / this.inactivityThreshold, 5);
      return Math.random() < (1 / factor); // 確率的に更新
    }

    return true;
  }

  /**
   * アクティブ状態を取得
   */
  isUserActive(): boolean {
    return this.isActive && (Date.now() - this.lastActivity < this.inactivityThreshold);
  }
}

/**
 * Reactコンポーネントでの使用例（フック）
 */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  configKey: keyof typeof AUTO_REFRESH_CONFIGS,
  enabled: boolean = true
) {
  if (typeof window === 'undefined') return; // SSR対策
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const managerRef = useRef<DynamicRefreshManager | null>(null);
  const activityRef = useRef<ActivityBasedRefresh | null>(null);
  
  useEffect(() => {
    if (!enabled || !AUTO_REFRESH_CONFIGS[configKey].enabled) {
      return;
    }
    
    // マネージャーの初期化
    managerRef.current = new DynamicRefreshManager(configKey);
    activityRef.current = new ActivityBasedRefresh();
    
    // 実行関数
    const execute = async () => {
      try {
        // アクティビティベースの制御
        if (activityRef.current && !activityRef.current.shouldUpdate(managerRef.current!.getCurrentInterval())) {
          return;
        }
        
        await callback();
        managerRef.current?.onSuccess();
      } catch (error) {
        console.error('Auto refresh error:', error);
        managerRef.current?.onError();
      }
      
      managerRef.current?.markUpdate();
    };
    
    // 初回実行
    execute();
    
    // インターバルの設定
    const setupInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      const interval = managerRef.current?.getCurrentInterval() || AUTO_REFRESH_CONFIGS[configKey].interval;
      intervalRef.current = setInterval(execute, interval);
    };
    
    setupInterval();
    
    // クリーンアップ（重要: メモリリークを防ぐ）
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      managerRef.current = null;
      activityRef.current = null;
    };
  }, [callback, configKey, enabled]);
}

/**
 * 推奨される使用例
 */
export const RECOMMENDED_REFRESH_PATTERNS = {
  // 重要度：高 - エラー監視ページ
  errorPage: {
    config: 'errorMonitoring',
    dynamic: true,
    activityBased: true,
    description: 'エラー発生時は更新頻度を上げ、平常時は下げる'
  },

  // 重要度：中 - ダッシュボード
  dashboard: {
    config: 'dashboardOverview',
    dynamic: false,
    activityBased: true,
    description: 'ユーザーがアクティブな時のみ更新'
  },

  // 重要度：低 - 統計ページ
  statistics: {
    config: 'characterStats',
    dynamic: false,
    activityBased: false,
    description: '定期的な更新で十分'
  }
};