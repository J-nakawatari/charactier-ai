import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import log from '../utils/logger';

// レート制限の設定
export const rateLimitConfigs = {
  // 一般的なAPI（読み取り系）
  general: {
    points: 300,     // リクエスト数（60秒間に300リクエストまで許可
    duration: 60,    // 60秒
    blockDuration: 60 // ブロック時間（秒）
  },
  
  // 認証関連
  auth: {
    points: 5,
    duration: 60,
    blockDuration: 300 // 5分ブロック
  },
  
  // チャットAPI（コスト保護）
  chat: {
    points: 60,      // 60メッセージ
    duration: 3600,  // 1時間
    blockDuration: 3600 // 1時間ブロック
  },
  
  // 決済関連
  payment: {
    points: 10,
    duration: 3600,
    blockDuration: 3600
  },
  
  // 管理者API（レート制限を緩和）
  admin: {
    points: 500,    // 200から500に増加
    duration: 60,
    blockDuration: 60
  },
  
  // ファイルアップロード
  upload: {
    points: 5,
    duration: 3600,
    blockDuration: 3600
  }
};

// レート制限インスタンスを作成
const rateLimiters = new Map<string, RateLimiterMemory>();

// レート制限ミドルウェアを作成する関数
export function createRateLimiter(configName: keyof typeof rateLimitConfigs) {
  const config = rateLimitConfigs[configName];
  
  // インスタンスをキャッシュ
  if (!rateLimiters.has(configName)) {
    rateLimiters.set(configName, new RateLimiterMemory({
      keyPrefix: `ratelimit_${configName}`,
      points: config.points,
      duration: config.duration,
      blockDuration: config.blockDuration
    }));
  }
  
  const limiter = rateLimiters.get(configName)!;
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // レート制限を無効化する環境変数（開発用）
      if (process.env.DISABLE_RATE_LIMIT === 'true') {
        next();
        return;
      }
      
      // IPアドレスの取得
      const ip = req.headers['x-real-ip'] as string || 
                 req.headers['x-forwarded-for'] as string || 
                 req.ip || 
                 'unknown';
      
      // 認証済みユーザーの場合はユーザーIDも考慮
      const userId = (req as any).user?.userId;
      const key = userId ? `${ip}_${userId}` : ip;
      
      // レート制限チェック
      await limiter.consume(key);
      
      // 残りのリクエスト数をヘッダーに追加
      const rateLimiterRes = await limiter.get(key);
      if (rateLimiterRes) {
        res.setHeader('X-RateLimit-Limit', config.points);
        res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
      }
      
      next();
    } catch (error) {
      if (error instanceof RateLimiterRes) {
        // レート制限に達した場合
        res.setHeader('X-RateLimit-Limit', config.points);
        res.setHeader('X-RateLimit-Remaining', error.remainingPoints);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + error.msBeforeNext).toISOString());
        res.setHeader('Retry-After', Math.round(error.msBeforeNext / 1000));
        
        log.warn(`Rate limit exceeded for ${configName}`, {
          ip: req.ip,
          path: req.path,
          userId: (req as any).user?.userId
        });
        
        res.status(429).json({
          error: 'Too many requests',
          message: 'リクエストが多すぎます。しばらくしてから再試行してください。',
          retryAfter: Math.round(error.msBeforeNext / 1000)
        });
        return;
      }
      
      // その他のエラー
      log.error('Rate limiter error', error as Error);
      next();
    }
  };
}

// 特定のエンドポイント用のカスタムレート制限
export function createCustomRateLimiter(points: number, duration: number, blockDuration?: number) {
  const limiter = new RateLimiterMemory({
    keyPrefix: `ratelimit_custom_${points}_${duration}`,
    points,
    duration,
    blockDuration: blockDuration || duration
  });
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (process.env.DISABLE_RATE_LIMIT === 'true') {
        next();
        return;
      }
      
      const ip = req.headers['x-real-ip'] as string || 
                 req.headers['x-forwarded-for'] as string || 
                 req.ip || 
                 'unknown';
      
      const userId = (req as any).user?.userId;
      const key = userId ? `${ip}_${userId}` : ip;
      
      await limiter.consume(key);
      
      const rateLimiterRes = await limiter.get(key);
      if (rateLimiterRes) {
        res.setHeader('X-RateLimit-Limit', points);
        res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
      }
      
      next();
    } catch (error) {
      if (error instanceof RateLimiterRes) {
        res.setHeader('X-RateLimit-Limit', points);
        res.setHeader('X-RateLimit-Remaining', error.remainingPoints);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + error.msBeforeNext).toISOString());
        res.setHeader('Retry-After', Math.round(error.msBeforeNext / 1000));
        
        res.status(429).json({
          error: 'Too many requests',
          message: 'リクエストが多すぎます。しばらくしてから再試行してください。',
          retryAfter: Math.round(error.msBeforeNext / 1000)
        });
        return;
      }
      
      log.error('Custom rate limiter error', error as Error);
      next();
    }
  };
}