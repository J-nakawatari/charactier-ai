import { Request, Response, NextFunction } from 'express';
import { ServerMonitor } from '../monitoring/ServerMonitor';

// レスポンスタイム測定用の拡張
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      monitoringRecorded?: boolean;
    }
    interface Response {
      _monitoringWrapped?: boolean;
    }
  }
}

export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // リクエスト開始時刻を記録
  req.startTime = Date.now();
  
  // すでにラップされている場合はスキップ（他のミドルウェアとの競合防止）
  if (res._monitoringWrapped) {
    next();
    return;
  }
  
  // 監視記録用の共通関数
  const recordMonitoring = () => {
    // 既に記録済みの場合はスキップ（重複カウント防止）
    if (!req.monitoringRecorded) {
      const responseTime = req.startTime ? Date.now() - req.startTime : 0;
      const monitor = ServerMonitor.getInstance();
      
      // 監視データを記録（ヘルスチェックAPIは除外）
      if (!req.path.includes('/health') && !req.path.includes('/monitoring')) {
        monitor.recordRequest(req, responseTime, res.statusCode);
        req.monitoringRecorded = true;
      }
    }
  };
  
  // res.sendをオーバーライド
  const originalSend = res.send;
  res.send = function(data: any) {
    recordMonitoring();
    return originalSend.call(this, data);
  };
  
  // res.jsonをオーバーライド
  const originalJson = res.json;
  res.json = function(data: any) {
    recordMonitoring();
    return originalJson.call(this, data);
  };
  
  // res.endをオーバーライド
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    recordMonitoring();
    return originalEnd.apply(this, args);
  };
  
  // このResponseオブジェクトが監視用にラップされたことを記録
  res._monitoringWrapped = true;
  
  next();
};