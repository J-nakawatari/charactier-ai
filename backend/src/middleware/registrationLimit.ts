import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// IP制限の設定
const registrationLimiter = new RateLimiterMemory({
  keyPrefix: 'registration',
  points: 3, // 3回まで
  duration: 86400, // 24時間（秒）
  blockDuration: 86400, // ブロック期間
});

// 短期間の連続登録を防ぐ
const shortTermLimiter = new RateLimiterMemory({
  keyPrefix: 'registration_short',
  points: 1, // 1回まで
  duration: 300, // 5分間
  blockDuration: 300,
});

export const registrationRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // 一時的にレート制限を無効化（テスト用）
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    console.log('⚠️ Registration rate limit is temporarily disabled for testing');
    next();
    return;
  }

  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // 短期間制限をチェック
    try {
      await shortTermLimiter.consume(ip);
    } catch (shortTermError) {
      res.status(429).json({
        error: 'Too many registration attempts',
        message: '登録の間隔が短すぎます。5分後に再試行してください。'
      });
      return;
    }
    
    // 1日あたりの制限をチェック
    try {
      await registrationLimiter.consume(ip);
    } catch (dailyError) {
      res.status(429).json({
        error: 'Registration limit exceeded',
        message: '本日の登録制限に達しました。24時間後に再試行してください。'
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error('Registration rate limit error:', error);
    next();
  }
};