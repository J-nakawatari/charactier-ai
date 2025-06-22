import { Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';

interface MonitoringData {
  requests: {
    total: number;
    byIp: Map<string, number>;
    lastHour: number;
  };
  errors: {
    total: number;
    byType: Map<string, number>;
    lastHour: number;
  };
  performance: {
    avgResponseTime: number;
    maxResponseTime: number;
    slowRequests: number;
  };
  suspiciousActivity: {
    bruteForceAttempts: Map<string, number>;
    suspiciousIps: Set<string>;
  };
  restartHistory: Array<{
    timestamp: string;
    reason: string;
  }>;
}

class ServerMonitor {
  private data: MonitoringData;
  private memoryStore: any;
  private readonly RESTART_HISTORY_FILE = '/var/www/charactier-ai/backend/restart-history.json';

  constructor(memoryStore: any) {
    this.memoryStore = memoryStore;
    this.data = {
      requests: {
        total: 0,
        byIp: new Map(),
        lastHour: 0
      },
      errors: {
        total: 0,
        byType: new Map(),
        lastHour: 0
      },
      performance: {
        avgResponseTime: 0,
        maxResponseTime: 0,
        slowRequests: 0
      },
      suspiciousActivity: {
        bruteForceAttempts: new Map(),
        suspiciousIps: new Set()
      },
      restartHistory: []
    };

    // Load restart history from file
    this.loadRestartHistory();
    
    // Record current restart
    this.recordRestart('Server restart detected');
  }

  private loadRestartHistory(): void {
    try {
      if (fs.existsSync(this.RESTART_HISTORY_FILE)) {
        const historyData = fs.readFileSync(this.RESTART_HISTORY_FILE, 'utf-8');
        const history = JSON.parse(historyData);
        this.data.restartHistory = history.restartHistory || [];
        
        // Keep only last 24 hours of history
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        this.data.restartHistory = this.data.restartHistory.filter(
          (item: any) => new Date(item.timestamp) > oneDayAgo
        );
      }
    } catch (error) {
      console.error('Failed to load restart history:', error);
      this.data.restartHistory = [];
    }
  }

  private saveRestartHistory(): void {
    try {
      const dir = path.dirname(this.RESTART_HISTORY_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(
        this.RESTART_HISTORY_FILE,
        JSON.stringify({ restartHistory: this.data.restartHistory }, null, 2)
      );
    } catch (error) {
      console.error('Failed to save restart history:', error);
    }
  }

  recordRestart(reason: string = 'Unknown'): void {
    const restart = {
      timestamp: new Date().toISOString(),
      reason
    };

    this.data.restartHistory.push(restart);
    
    // Keep only last 100 restarts or 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    this.data.restartHistory = this.data.restartHistory
      .filter((item: any) => new Date(item.timestamp) > oneDayAgo)
      .slice(-100);

    // Save to persistent storage
    this.saveRestartHistory();

    // Also update memory store for backward compatibility
    const currentHistory = this.memoryStore.get('server:restart:history') || [];
    currentHistory.push(restart);
    this.memoryStore.set('server:restart:history', currentHistory.slice(-100));

    console.log(`🔄 Server restart recorded. Total restarts in last 24h: ${this.getRestartCount()}`);
  }

  getRestartCount(): number {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    return this.data.restartHistory.filter(
      (restart: any) => new Date(restart.timestamp) > oneDayAgo
    ).length;
  }

  getRestartHistory(): Array<{ timestamp: string; reason: string }> {
    return [...this.data.restartHistory];
  }

  recordRequest(req: Request, responseTime: number): void {
    const ip = req.ip || 'unknown';
    
    this.data.requests.total++;
    this.data.requests.byIp.set(ip, (this.data.requests.byIp.get(ip) || 0) + 1);
    
    // Update performance metrics
    const currentAvg = this.data.performance.avgResponseTime;
    this.data.performance.avgResponseTime = 
      (currentAvg * (this.data.requests.total - 1) + responseTime) / this.data.requests.total;
    
    if (responseTime > this.data.performance.maxResponseTime) {
      this.data.performance.maxResponseTime = responseTime;
    }
    
    if (responseTime > 1000) {
      this.data.performance.slowRequests++;
    }
  }

  recordError(error: string, type: string = 'unknown'): void {
    this.data.errors.total++;
    this.data.errors.byType.set(type, (this.data.errors.byType.get(type) || 0) + 1);
  }

  recordSuspiciousActivity(ip: string, activityType: string): void {
    if (activityType === 'brute_force') {
      const attempts = this.data.suspiciousActivity.bruteForceAttempts.get(ip) || 0;
      this.data.suspiciousActivity.bruteForceAttempts.set(ip, attempts + 1);
      
      if (attempts + 1 > 5) {
        this.data.suspiciousActivity.suspiciousIps.add(ip);
      }
    }
  }

  getMonitoringData(): any {
    return {
      requests: {
        total: this.data.requests.total,
        byIp: Object.fromEntries(this.data.requests.byIp),
        uniqueIps: this.data.requests.byIp.size
      },
      errors: {
        total: this.data.errors.total,
        byType: Object.fromEntries(this.data.errors.byType),
        errorRate: this.data.requests.total > 0 
          ? (this.data.errors.total / this.data.requests.total * 100).toFixed(2) + '%'
          : '0%'
      },
      performance: {
        avgResponseTime: Math.round(this.data.performance.avgResponseTime),
        maxResponseTime: this.data.performance.maxResponseTime,
        slowRequests: this.data.performance.slowRequests,
        slowRequestRate: this.data.requests.total > 0
          ? (this.data.performance.slowRequests / this.data.requests.total * 100).toFixed(2) + '%'
          : '0%'
      },
      suspiciousActivity: {
        bruteForceAttempts: Object.fromEntries(this.data.suspiciousActivity.bruteForceAttempts),
        suspiciousIps: Array.from(this.data.suspiciousActivity.suspiciousIps),
        totalSuspiciousIps: this.data.suspiciousActivity.suspiciousIps.size
      },
      restartCount: this.getRestartCount(),
      restartHistory: this.getRestartHistory(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  reset(): void {
    // Reset hourly metrics but keep restart history
    const restartHistory = [...this.data.restartHistory];
    
    this.data = {
      requests: {
        total: 0,
        byIp: new Map(),
        lastHour: 0
      },
      errors: {
        total: 0,
        byType: new Map(),
        lastHour: 0
      },
      performance: {
        avgResponseTime: 0,
        maxResponseTime: 0,
        slowRequests: 0
      },
      suspiciousActivity: {
        bruteForceAttempts: new Map(),
        suspiciousIps: new Set()
      },
      restartHistory: restartHistory
    };
  }
}

export default ServerMonitor;