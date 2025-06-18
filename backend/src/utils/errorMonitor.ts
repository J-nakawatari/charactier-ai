/**
 * エラー率監視ユーティリティ
 * システムエラーの発生率を監視して管理者に通知
 */

import { createErrorRateAlert } from './adminNotificationCreator';

// エラー統計を保存するインメモリストア
interface ErrorStats {
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
}

class ErrorMonitor {
  private errorCounts: Map<string, ErrorStats> = new Map();
  private notificationCooldowns: Map<string, number> = new Map();
  
  // 閾値設定
  private readonly thresholds = {
    // 5分間で10回以上同じエラー
    TIME_WINDOW: 5 * 60 * 1000, // 5分（ミリ秒）
    ERROR_THRESHOLD: 10,
    
    // 通知のクールダウン時間（同じエラータイプで30分間は通知しない）
    NOTIFICATION_COOLDOWN: 30 * 60 * 1000, // 30分
  };

  /**
   * エラーを記録して閾値チェック
   */
  async recordError(errorType: string, errorMessage?: string): Promise<void> {
    try {
      const now = new Date();
      const key = this.normalizeErrorType(errorType);
      
      // エラー統計を更新
      const stats = this.errorCounts.get(key) || {
        count: 0,
        firstOccurrence: now,
        lastOccurrence: now
      };
      
      // 時間窓を超えた古いエラーはリセット
      if (now.getTime() - stats.firstOccurrence.getTime() > this.thresholds.TIME_WINDOW) {
        stats.count = 1;
        stats.firstOccurrence = now;
      } else {
        stats.count++;
      }
      
      stats.lastOccurrence = now;
      this.errorCounts.set(key, stats);
      
      // 閾値チェック
      if (stats.count >= this.thresholds.ERROR_THRESHOLD) {
        await this.checkAndNotify(key, stats);
      }
      
    } catch (error) {
      console.error('エラー記録処理でエラー:', error);
    }
  }

  /**
   * エラータイプを正規化（類似エラーをグループ化）
   */
  private normalizeErrorType(errorType: string): string {
    // OpenAI関連エラー
    if (errorType.includes('openai') || errorType.includes('OpenAI')) {
      return 'openai_api_error';
    }
    
    // MongoDB関連エラー
    if (errorType.includes('mongo') || errorType.includes('MongoDB')) {
      return 'database_error';
    }
    
    // 認証関連エラー
    if (errorType.includes('auth') || errorType.includes('token') || errorType.includes('unauthorized')) {
      return 'authentication_error';
    }
    
    // Rate Limit関連エラー
    if (errorType.includes('rate') || errorType.includes('limit')) {
      return 'rate_limit_error';
    }
    
    // その他は小文字に正規化
    return errorType.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  /**
   * 通知の必要性をチェックして送信
   */
  private async checkAndNotify(errorType: string, stats: ErrorStats): Promise<void> {
    const now = Date.now();
    const lastNotification = this.notificationCooldowns.get(errorType) || 0;
    
    // クールダウン期間中は通知しない
    if (now - lastNotification < this.thresholds.NOTIFICATION_COOLDOWN) {
      return;
    }
    
    try {
      const timeWindow = `${Math.round(this.thresholds.TIME_WINDOW / 60000)}分間`;
      
      await createErrorRateAlert(
        errorType,
        stats.count,
        timeWindow
      );
      
      // 通知時刻を記録
      this.notificationCooldowns.set(errorType, now);
      
      console.log(`✅ エラー率上昇通知を送信: ${errorType} (${stats.count}件 in ${timeWindow})`);
      
    } catch (error) {
      console.error('エラー率通知送信エラー:', error);
    }
  }

  /**
   * 古い統計データをクリーンアップ（定期実行用）
   */
  cleanup(): void {
    const now = Date.now();
    const cutoff = this.thresholds.TIME_WINDOW * 2; // 時間窓の2倍経過したデータを削除
    
    for (const [key, stats] of this.errorCounts.entries()) {
      if (now - stats.lastOccurrence.getTime() > cutoff) {
        this.errorCounts.delete(key);
      }
    }
    
    // 通知クールダウンも古いものは削除
    for (const [key, timestamp] of this.notificationCooldowns.entries()) {
      if (now - timestamp > this.thresholds.NOTIFICATION_COOLDOWN * 2) {
        this.notificationCooldowns.delete(key);
      }
    }
  }

  /**
   * 現在のエラー統計を取得（デバッグ用）
   */
  getStats(): { errorType: string; count: number; timeWindow: string }[] {
    const now = new Date();
    const stats: { errorType: string; count: number; timeWindow: string }[] = [];
    
    for (const [errorType, errorStats] of this.errorCounts.entries()) {
      const timeWindow = Math.round((now.getTime() - errorStats.firstOccurrence.getTime()) / 60000);
      stats.push({
        errorType,
        count: errorStats.count,
        timeWindow: `${timeWindow}分間`
      });
    }
    
    return stats;
  }
}

// シングルトンインスタンス
const errorMonitor = new ErrorMonitor();

// 10分毎にクリーンアップを実行
setInterval(() => {
  errorMonitor.cleanup();
}, 10 * 60 * 1000);

/**
 * エラーを記録（外部からの呼び出し用）
 */
export async function recordError(errorType: string, errorMessage?: string): Promise<void> {
  await errorMonitor.recordError(errorType, errorMessage);
}

/**
 * エラー統計を取得（デバッグ用）
 */
export function getErrorStats(): { errorType: string; count: number; timeWindow: string }[] {
  return errorMonitor.getStats();
}