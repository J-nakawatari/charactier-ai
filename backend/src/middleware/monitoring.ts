import { Request, Response, NextFunction } from 'express';
import { ServerMonitor } from '../monitoring/ServerMonitor';

// レスポンスタイム測定用の拡張
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
    }
  }
}

export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // リクエスト開始時刻を記録
  req.startTime = Date.now();
  
  // レスポンス送信時に監視データを記録
  const originalSend = res.send;
  res.send = function(data: any) {
    const responseTime = req.startTime ? Date.now() - req.startTime : 0;
    const monitor = ServerMonitor.getInstance();
    
    // 監視データを記録（ヘルスチェックAPIは除外）
    if (!req.path.includes('/health') && !req.path.includes('/monitoring')) {
      monitor.recordRequest(req, responseTime, res.statusCode);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};