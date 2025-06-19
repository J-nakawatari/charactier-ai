import { Request } from 'express';

interface RequestCount {
  count: number;
  firstRequest: Date;
  lastRequest: Date;
}

interface Alert {
  type: 'high_restart_count' | 'suspicious_requests' | 'high_error_rate' | 'memory_warning';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
}

interface ErrorStats {
  total: number;
  errors5xx: number;
  errors4xx: number;
}

interface PerformanceStats {
  totalRequests: number;
  totalResponseTime: number;
  slowRequests: number;
}

export class ServerMonitor {
  private static instance: ServerMonitor;
  
  private startTime: number;
  private restartCount: number;
  private requestCounts: Map<string, RequestCount>;
  private errorStats: ErrorStats;
  private performanceStats: PerformanceStats;
  private alerts: Alert[];
  private restartHistory: { timestamp: Date; reason: string }[];
  
  private constructor() {
    this.startTime = Date.now();
    this.restartCount = this.loadRestartCount();
    this.requestCounts = new Map();
    this.errorStats = { total: 0, errors5xx: 0, errors4xx: 0 };
    this.performanceStats = { totalRequests: 0, totalResponseTime: 0, slowRequests: 0 };
    this.alerts = [];
    this.restartHistory = this.loadRestartHistory();
    
    // 再起動をカウント
    this.incrementRestartCount();
    
    // 1分ごとに異常をチェック
    setInterval(() => {
      this.checkAnomalies();
      this.cleanupOldData();
    }, 60000);
    
    // 5分ごとにリクエストカウントをリセット
    setInterval(() => {
      this.requestCounts.clear();
    }, 300000);
  }
  
  static getInstance(): ServerMonitor {
    if (!ServerMonitor.instance) {
      ServerMonitor.instance = new ServerMonitor();
    }
    return ServerMonitor.instance;
  }
  
  private loadRestartCount(): number {
    // 実際の実装では、ファイルやRedisから読み込む
    return 0;
  }
  
  private saveRestartCount(): void {
    // 実際の実装では、ファイルやRedisに保存
  }
  
  private loadRestartHistory(): { timestamp: Date; reason: string }[] {
    // 実際の実装では、永続化されたデータから読み込む
    return [];
  }
  
  private incrementRestartCount(): void {
    this.restartCount++;
    this.saveRestartCount();
    
    this.restartHistory.push({
      timestamp: new Date(),
      reason: 'Server restart detected'
    });
    
    // 最近24時間のデータのみ保持
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.restartHistory = this.restartHistory.filter(r => r.timestamp > dayAgo);
  }
  
  recordRequest(req: Request, responseTime: number, statusCode: number): void {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // リクエストカウント更新
    const current = this.requestCounts.get(ip) || {
      count: 0,
      firstRequest: new Date(),
      lastRequest: new Date()
    };
    
    current.count++;
    current.lastRequest = new Date();
    this.requestCounts.set(ip, current);
    
    // エラー統計更新
    this.errorStats.total++;
    if (statusCode >= 500) {
      this.errorStats.errors5xx++;
    } else if (statusCode >= 400) {
      this.errorStats.errors4xx++;
    }
    
    // パフォーマンス統計更新
    this.performanceStats.totalRequests++;
    this.performanceStats.totalResponseTime += responseTime;
    
    if (responseTime > 1000) {
      this.performanceStats.slowRequests++;
    }
  }
  
  private checkAnomalies(): void {
    const now = new Date();
    
    // 1. 再起動回数チェック（1時間で5回以上）
    const recentRestarts = this.restartHistory.filter(
      r => r.timestamp > new Date(now.getTime() - 60 * 60 * 1000)
    ).length;
    
    if (recentRestarts >= 5) {
      this.addAlert({
        type: 'high_restart_count',
        severity: 'critical',
        message: `過去1時間で${recentRestarts}回の再起動を検知しました`,
        timestamp: now
      });
    }
    
    // 2. 異常なリクエスト数チェック（1分間に100回以上）
    this.requestCounts.forEach((data, ip) => {
      const timeDiff = now.getTime() - data.firstRequest.getTime();
      const requestsPerMinute = (data.count / timeDiff) * 60000;
      
      if (requestsPerMinute > 100) {
        this.addAlert({
          type: 'suspicious_requests',
          severity: 'warning',
          message: `${ip}から異常なリクエスト数を検知: ${Math.round(requestsPerMinute)}回/分`,
          timestamp: now
        });
      }
    });
    
    // 3. エラー率チェック（5%以上）
    const errorRate = this.getErrorRate();
    if (errorRate > 5) {
      this.addAlert({
        type: 'high_error_rate',
        severity: 'warning',
        message: `高いエラー率を検知: ${errorRate.toFixed(1)}%`,
        timestamp: now
      });
    }
    
    // 4. メモリ使用率チェック
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage.percentage > 80) {
      this.addAlert({
        type: 'memory_warning',
        severity: memoryUsage.percentage > 90 ? 'critical' : 'warning',
        message: `メモリ使用率が高い状態です: ${memoryUsage.percentage.toFixed(1)}% (${(memoryUsage.used / 1024).toFixed(2)}GB / ${(memoryUsage.total / 1024).toFixed(0)}GB)`,
        timestamp: now
      });
    }
  }
  
  private addAlert(alert: Alert): void {
    // 同じタイプのアラートが最近5分以内にある場合は追加しない
    const recentAlert = this.alerts.find(
      a => a.type === alert.type && 
      alert.timestamp.getTime() - a.timestamp.getTime() < 5 * 60 * 1000
    );
    
    if (!recentAlert) {
      this.alerts.push(alert);
      console.error(`🚨 [ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);
    }
  }
  
  private cleanupOldData(): void {
    // 1時間以上前のアラートを削除
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.alerts = this.alerts.filter(a => a.timestamp > hourAgo);
  }
  
  private getMemoryUsage() {
    const used = process.memoryUsage();
    // RSS (Resident Set Size) = 実際に使用している物理メモリ
    const rssGB = used.rss / 1024 / 1024 / 1024;
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    
    // VPSの実際のメモリを取得（環境変数で設定可能）
    const systemTotalGB = parseFloat(process.env.SYSTEM_MEMORY_GB || '4'); // デフォルト4GB
    const percentage = (rssGB / systemTotalGB) * 100;
    
    return {
      percentage,
      used: Math.round(rssGB * 1024), // MB単位で返す
      total: Math.round(systemTotalGB * 1024), // MB単位で返す
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB
    };
  }
  
  private getErrorRate(): number {
    if (this.errorStats.total === 0) return 0;
    return ((this.errorStats.errors5xx + this.errorStats.errors4xx) / this.errorStats.total) * 100;
  }
  
  getHealthStatus() {
    const memoryUsage = this.getMemoryUsage();
    const errorRate = this.getErrorRate();
    const uptime = Date.now() - this.startTime;
    
    // ステータス判定
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (this.alerts.some(a => a.severity === 'critical')) {
      status = 'critical';
    } else if (this.alerts.some(a => a.severity === 'warning')) {
      status = 'warning';
    }
    
    return {
      status,
      uptime,
      restartCount: this.restartCount,
      memoryUsage,
      errorRate,
      alerts: this.alerts.map(a => ({
        type: a.type,
        severity: a.severity,
        message: a.message,
        timestamp: a.timestamp.toISOString()
      }))
    };
  }
  
  getMonitoringData(period: string = '1h') {
    const now = new Date();
    let startTime: Date;
    
    switch (period) {
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default: // 1h
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
    }
    
    // IPごとのリクエスト統計
    const requestStats = Array.from(this.requestCounts.entries())
      .map(([ip, data]) => ({
        ip,
        count: data.count,
        suspicious: data.count > 100 // 1分間に100回以上は怪しい
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // 上位10件
    
    // パフォーマンス統計
    const avgResponseTime = this.performanceStats.totalRequests > 0
      ? this.performanceStats.totalResponseTime / this.performanceStats.totalRequests
      : 0;
    
    return {
      timeRange: {
        start: startTime.toISOString(),
        end: now.toISOString()
      },
      requestStats: {
        total: this.performanceStats.totalRequests,
        byIp: requestStats
      },
      errorStats: {
        total: this.errorStats.total,
        by5xx: this.errorStats.errors5xx,
        by4xx: this.errorStats.errors4xx,
        errorRate: this.getErrorRate()
      },
      performanceStats: {
        avgResponseTime,
        slowRequests: this.performanceStats.slowRequests
      },
      restartHistory: this.restartHistory
        .filter(r => r.timestamp > startTime)
        .map(r => ({
          timestamp: r.timestamp.toISOString(),
          reason: r.reason
        }))
    };
  }
}