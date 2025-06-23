import { Request } from 'express';
import { getRedisClient } from '../../lib/redis';

interface RequestCount {
  count: number;
  firstRequest: Date;
  lastRequest: Date;
  userAgent?: string;
  paths: Map<string, number>;
  referer?: string;
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
  windowStartTime: number; // 統計収集開始時刻
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
    this.restartCount = 0;
    this.requestCounts = new Map();
    this.errorStats = { total: 0, errors5xx: 0, errors4xx: 0 };
    this.performanceStats = { totalRequests: 0, totalResponseTime: 0, slowRequests: 0, windowStartTime: Date.now() };
    this.alerts = [];
    this.restartHistory = [];
    
    // 非同期で初期化
    this.initialize();
    
    // 1分ごとに異常をチェック
    setInterval(() => {
      this.checkAnomalies();
      this.cleanupOldData();
    }, 60000);
    
    // 5分ごとにリクエストカウントをリセット
    setInterval(() => {
      this.requestCounts.clear();
    }, 300000);
    
    // 1時間ごとに統計をリセット（メモリリークとデータの正確性のため）
    setInterval(() => {
      this.resetStats();
      console.log('📊 Hourly stats reset completed');
    }, 3600000);
  }
  
  private async initialize() {
    // Redisから再起動履歴を読み込み
    await this.loadRestartHistory();
    this.restartCount = this.restartHistory.length;
    
    // 再起動を記録
    await this.incrementRestartCount();
  }
  
  static getInstance(): ServerMonitor {
    if (!ServerMonitor.instance) {
      ServerMonitor.instance = new ServerMonitor();
    }
    return ServerMonitor.instance;
  }
  
  private async loadRestartHistory(): Promise<void> {
    try {
      const redis = await getRedisClient();
      const historyJson = await redis.get('server:restart:history');
      
      if (historyJson) {
        const history = JSON.parse(historyJson);
        this.restartHistory = history.map((item: any) => ({
          timestamp: new Date(item.timestamp),
          reason: item.reason
        }));
        
        // 24時間以内のデータのみ保持
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        this.restartHistory = this.restartHistory.filter(r => r.timestamp > dayAgo);
      }
    } catch (error) {
      console.error('Failed to load restart history from Redis:', error);
    }
  }
  
  private async saveRestartHistory(): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.set(
        'server:restart:history',
        JSON.stringify(this.restartHistory),
        'EX',
        86400 * 7 // 7日間保持
      );
    } catch (error) {
      console.error('Failed to save restart history to Redis:', error);
    }
  }
  
  private async incrementRestartCount(): Promise<void> {
    // 新しい再起動を記録
    const restart = {
      timestamp: new Date(),
      reason: 'Server restart detected'
    };
    
    this.restartHistory.push(restart);
    
    // 最近24時間のデータのみ保持
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.restartHistory = this.restartHistory.filter(r => r.timestamp > dayAgo);
    
    // カウントを更新
    this.restartCount = this.restartHistory.length;
    
    // Redisに保存
    await this.saveRestartHistory();
    
    console.log(`🔄 Server restart recorded. Total restarts in last 24h: ${this.restartCount}`);
  }
  
  recordRequest(req: Request, responseTime: number, statusCode: number): void {
    // Nginxからの実際のクライアントIPを取得
    const ip = req.headers['x-real-ip'] as string || 
                req.headers['x-forwarded-for'] as string || 
                req.ip || 
                req.connection.remoteAddress || 
                'unknown';
    
    // リクエストカウント更新
    const current = this.requestCounts.get(ip) || {
      count: 0,
      firstRequest: new Date(),
      lastRequest: new Date(),
      paths: new Map<string, number>()
    };
    
    current.count++;
    current.lastRequest = new Date();
    
    // User-Agentを記録（最新のものを保持）
    if (req.headers['user-agent']) {
      current.userAgent = req.headers['user-agent'] as string;
    }
    
    // Refererを記録
    if (req.headers['referer']) {
      current.referer = req.headers['referer'] as string;
    }
    
    // アクセスパスを記録
    const path = req.path;
    const pathCount = current.paths.get(path) || 0;
    current.paths.set(path, pathCount + 1);
    
    this.requestCounts.set(ip, current);
    
    // パフォーマンス統計更新
    this.performanceStats.totalRequests++;
    this.performanceStats.totalResponseTime += responseTime;
    if (responseTime > 1000) {
      this.performanceStats.slowRequests++;
    }
    
    // エラー統計更新（エラーの場合のみカウント）
    if (statusCode >= 400) {
      this.errorStats.total++;
      if (statusCode >= 500) {
        this.errorStats.errors5xx++;
      } else {
        this.errorStats.errors4xx++;
      }
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
    
    // 2. 異常なリクエスト数チェック（過去1分間で100回以上）
    this.requestCounts.forEach((data, ip) => {
      // 過去1分間のリクエストをカウント
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      
      // 最近のリクエストのみチェック（過去1分以内にリクエストがある場合）
      if (data.lastRequest > oneMinuteAgo) {
        // 簡易的な計算: 全体のレートが高い場合のみアラート
        // より正確にするには、時系列でリクエスト履歴を保持する必要がある
        const timeDiff = now.getTime() - data.firstRequest.getTime();
        const minutesElapsed = Math.max(timeDiff / 60000, 1);
        const averageRequestsPerMinute = data.count / minutesElapsed;
        
        // 平均レートが非常に高い場合のみアラート（短期間の場合を考慮）
        if (averageRequestsPerMinute > 500 && data.count > 100) {
          this.addAlert({
            type: 'suspicious_requests',
            severity: 'warning',
            message: `${ip}から異常なリクエスト数を検知: 累計${data.count}回（平均${Math.round(averageRequestsPerMinute)}回/分）`,
            timestamp: now
          });
        }
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
    if (this.performanceStats.totalRequests === 0) return 0;
    
    // エラー数がリクエスト総数を超えることがないようにする（統計リセットタイミングのズレ対策）
    const effectiveErrorCount = Math.min(this.errorStats.total, this.performanceStats.totalRequests);
    return (effectiveErrorCount / this.performanceStats.totalRequests) * 100;
  }
  
  getPerformanceStats() {
    const windowDuration = Date.now() - this.performanceStats.windowStartTime;
    const requestsPerMinute = windowDuration > 0 
      ? (this.performanceStats.totalRequests / windowDuration) * 60000 
      : 0;
      
    return {
      totalRequests: this.performanceStats.totalRequests,
      totalErrors: this.errorStats.total,
      errors5xx: this.errorStats.errors5xx,
      errors4xx: this.errorStats.errors4xx,
      avgResponseTime: this.performanceStats.totalRequests > 0 
        ? Math.round(this.performanceStats.totalResponseTime / this.performanceStats.totalRequests)
        : 0,
      slowRequests: this.performanceStats.slowRequests,
      errorRate: this.getErrorRate(),
      requestsPerMinute: Math.round(requestsPerMinute),
      windowDurationMinutes: Math.round(windowDuration / 60000)
    };
  }

  // 統計をリセット（定期リセット用）
  resetStats() {
    // 同時にリセットして不整合を防ぐ
    const now = Date.now();
    
    this.performanceStats = {
      totalRequests: 0,
      totalResponseTime: 0,
      slowRequests: 0,
      windowStartTime: now
    };
    
    this.errorStats = {
      total: 0,
      errors5xx: 0,
      errors4xx: 0
    };
    
    console.log(`📊 ServerMonitor stats reset at ${new Date(now).toISOString()}`);
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
    
    // 統計収集期間の情報を追加
    const statsWindowStart = new Date(this.performanceStats.windowStartTime);
    const statsWindowMinutes = Math.round((Date.now() - this.performanceStats.windowStartTime) / 60000);
    
    // IPごとのリクエスト統計
    const requestStats = Array.from(this.requestCounts.entries())
      .map(([ip, data]) => {
        // アクセスパスの上位3件を取得
        const topPaths = Array.from(data.paths.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([path, count]) => ({ path, count }));
        
        // ボット判定（簡易的）
        const isBot = data.userAgent ? 
          /bot|crawler|spider|scraper|facebookexternalhit|whatsapp/i.test(data.userAgent) : false;
        
        return {
          ip,
          count: data.count,
          suspicious: data.count > 100, // 1分間に100回以上は怪しい
          userAgent: data.userAgent || 'Unknown',
          isBot,
          topPaths,
          referer: data.referer || 'Direct',
          firstSeen: data.firstRequest,
          lastSeen: data.lastRequest
        };
      })
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
      statsWindow: {
        start: statsWindowStart.toISOString(),
        durationMinutes: statsWindowMinutes,
        note: '統計は1時間ごとにリセットされます'
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