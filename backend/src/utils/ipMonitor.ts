/**
 * IP大量リクエスト監視ユーティリティ
 * 同一IPからの異常なリクエスト数を検出して管理者に通知
 */

import { createIPRateLimitAlert } from './adminNotificationCreator';

// IPリクエスト統計を保存するインメモリストア
interface IPStats {
  count: number;
  firstRequest: Date;
  lastRequest: Date;
}

class IPMonitor {
  private ipCounts: Map<string, IPStats> = new Map();
  private notificationCooldowns: Map<string, number> = new Map();
  
  // 閾値設定
  private readonly thresholds = {
    // 5分間で100リクエスト以上
    TIME_WINDOW: 5 * 60 * 1000, // 5分（ミリ秒）
    REQUEST_THRESHOLD: 100,
    
    // 通知のクールダウン時間（同じIPで15分間は通知しない）
    NOTIFICATION_COOLDOWN: 15 * 60 * 1000, // 15分
    
    // 除外するIP（ローカル、プライベートIPなど）
    EXCLUDED_IPS: [
      '127.0.0.1',
      'localhost',
      '::1',
      // プライベートIPレンジ（必要に応じて追加）
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./
    ]
  };

  /**
   * IPからのリクエストを記録して閾値チェック
   */
  async recordRequest(ipAddress: string, userAgent?: string): Promise<void> {
    try {
      // 除外IPをチェック
      if (this.isExcludedIP(ipAddress)) {
        return;
      }
      
      const now = new Date();
      
      // IP統計を更新
      const stats = this.ipCounts.get(ipAddress) || {
        count: 0,
        firstRequest: now,
        lastRequest: now
      };
      
      // 時間窓を超えた古いリクエストはリセット
      if (now.getTime() - stats.firstRequest.getTime() > this.thresholds.TIME_WINDOW) {
        stats.count = 1;
        stats.firstRequest = now;
      } else {
        stats.count++;
      }
      
      stats.lastRequest = now;
      this.ipCounts.set(ipAddress, stats);
      
      // 閾値チェック
      if (stats.count >= this.thresholds.REQUEST_THRESHOLD) {
        await this.checkAndNotify(ipAddress, stats);
      }
      
    } catch (error) {
      console.error('IPリクエスト記録処理でエラー:', error);
    }
  }

  /**
   * 除外IPかどうかをチェック
   */
  private isExcludedIP(ipAddress: string): boolean {
    for (const excluded of this.thresholds.EXCLUDED_IPS) {
      if (typeof excluded === 'string') {
        if (ipAddress === excluded) {
          return true;
        }
      } else if (excluded instanceof RegExp) {
        if (excluded.test(ipAddress)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 通知の必要性をチェックして送信
   */
  private async checkAndNotify(ipAddress: string, stats: IPStats): Promise<void> {
    const now = Date.now();
    const lastNotification = this.notificationCooldowns.get(ipAddress) || 0;
    
    // クールダウン期間中は通知しない
    if (now - lastNotification < this.thresholds.NOTIFICATION_COOLDOWN) {
      return;
    }
    
    try {
      const timeWindow = `${Math.round(this.thresholds.TIME_WINDOW / 60000)}分間`;
      
      await createIPRateLimitAlert(
        ipAddress,
        stats.count,
        timeWindow
      );
      
      // 通知時刻を記録
      this.notificationCooldowns.set(ipAddress, now);
      
      console.log(`✅ IP大量リクエスト通知を送信: ${ipAddress} (${stats.count}件 in ${timeWindow})`);
      
    } catch (error) {
      console.error('IP大量リクエスト通知送信エラー:', error);
    }
  }

  /**
   * 古い統計データをクリーンアップ（定期実行用）
   */
  cleanup(): void {
    const now = Date.now();
    const cutoff = this.thresholds.TIME_WINDOW * 2; // 時間窓の2倍経過したデータを削除
    
    for (const [ip, stats] of this.ipCounts.entries()) {
      if (now - stats.lastRequest.getTime() > cutoff) {
        this.ipCounts.delete(ip);
      }
    }
    
    // 通知クールダウンも古いものは削除
    for (const [ip, timestamp] of this.notificationCooldowns.entries()) {
      if (now - timestamp > this.thresholds.NOTIFICATION_COOLDOWN * 2) {
        this.notificationCooldowns.delete(ip);
      }
    }
  }

  /**
   * 現在のIP統計を取得（デバッグ用）
   */
  getStats(): { ip: string; count: number; timeWindow: string }[] {
    const now = new Date();
    const stats: { ip: string; count: number; timeWindow: string }[] = [];
    
    for (const [ip, ipStats] of this.ipCounts.entries()) {
      const timeWindow = Math.round((now.getTime() - ipStats.firstRequest.getTime()) / 60000);
      stats.push({
        ip,
        count: ipStats.count,
        timeWindow: `${timeWindow}分間`
      });
    }
    
    return stats.sort((a, b) => b.count - a.count); // リクエスト数の多い順
  }

  /**
   * 特定IPの詳細統計を取得
   */
  getIPDetails(ipAddress: string): IPStats | null {
    return this.ipCounts.get(ipAddress) || null;
  }
}

// シングルトンインスタンス
const ipMonitor = new IPMonitor();

// 10分毎にクリーンアップを実行
setInterval(() => {
  ipMonitor.cleanup();
}, 10 * 60 * 1000);

/**
 * IPリクエストを記録（外部からの呼び出し用）
 */
export async function recordIPRequest(ipAddress: string, userAgent?: string): Promise<void> {
  await ipMonitor.recordRequest(ipAddress, userAgent);
}

/**
 * IP統計を取得（デバッグ用）
 */
export function getIPStats(): { ip: string; count: number; timeWindow: string }[] {
  return ipMonitor.getStats();
}

/**
 * 特定IPの詳細を取得
 */
export function getIPDetails(ipAddress: string): IPStats | null {
  return ipMonitor.getIPDetails(ipAddress);
}