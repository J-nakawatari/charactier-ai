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
  points: 3, // 3回まで（テスト用に緩和）
  duration: 60, // 1分間（テスト用に短縮）
  blockDuration: 60,
});

export const registrationRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // 一時的にレート制限を無効化（テスト用）
  if (process.env.DISABLE_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'development') {
    console.log('⚠️ Registration rate limit is temporarily disabled');
    next();
    return;
  }
  
  // 緊急用: 特定のIPアドレスをホワイトリスト化
  const whitelistedIPs = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
  const clientIP = (req.headers['x-real-ip'] as string) || 
                   (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                   req.ip || 
                   'unknown';
  
  if (whitelistedIPs.includes(clientIP)) {
    console.log('✅ Whitelisted IP, bypassing rate limit:', clientIP);
    next();
    return;
  }

  try {
    // Nginx経由の場合、x-real-ipまたはx-forwarded-forからIPを取得
    const ip = (req.headers['x-real-ip'] as string) || 
               (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
               req.ip || 
               req.connection.remoteAddress || 
               'unknown';
    
    console.log('🔍 Registration rate limit check - IP:', ip, 'Headers:', {
      'x-real-ip': req.headers['x-real-ip'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'req.ip': req.ip
    });
    
    // 短期間制限をチェック
    try {
      const limiterRes = await shortTermLimiter.get(ip);
      const now = new Date();
      console.log('📊 Short-term limiter status:', {
        ip,
        consumedPoints: limiterRes ? limiterRes.consumedPoints : 0,
        remainingPoints: limiterRes ? limiterRes.remainingPoints : 3,
        msBeforeNext: limiterRes ? limiterRes.msBeforeNext : 0,
        resetTime: limiterRes && limiterRes.msBeforeNext ? new Date(now.getTime() + limiterRes.msBeforeNext).toISOString() : 'No limit',
        currentTime: now.toISOString()
      });
      
      await shortTermLimiter.consume(ip);
    } catch (shortTermError) {
      const limiterRes = await shortTermLimiter.get(ip);
      const resetTime = limiterRes && limiterRes.msBeforeNext 
        ? Math.ceil(limiterRes.msBeforeNext / 1000) 
        : 60;
      
      console.error('❌ Short-term rate limit exceeded:', {
        ip,
        consumedPoints: limiterRes?.consumedPoints,
        resetInSeconds: resetTime
      });
      
      res.status(429).json({
        error: 'Too many registration attempts',
        message: `登録の間隔が短すぎます。${resetTime}秒後に再試行してください。`,
        retryAfter: resetTime
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