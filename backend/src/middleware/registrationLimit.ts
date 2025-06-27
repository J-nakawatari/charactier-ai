import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * 登録レート制限の実装
 * 
 * 重要: レート制限は登録成功時のみカウントされます
 * - エラー（既存メール、弱いパスワード等）ではカウントしません
 * - これにより、ユーザーがエラーを修正して再試行できます
 */

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
  points: 3, // 3回まで
  duration: 60, // 1分間
  blockDuration: 60,
});

// レート制限チェックのみを行うミドルウェア（カウントはしない）
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
    
    // IPアドレスをreqオブジェクトに保存（後で使用）
    (req as any).clientIP = ip;
    
    console.log('🔍 Registration rate limit check - IP:', ip, 'Headers:', {
      'x-real-ip': req.headers['x-real-ip'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'req.ip': req.ip
    });
    
    // 短期間制限をチェック（消費せずに確認のみ）
    const shortTermStatus = await shortTermLimiter.get(ip);
    if (shortTermStatus && shortTermStatus.consumedPoints >= 3) {
      const resetTime = Math.ceil(shortTermStatus.msBeforeNext / 1000);
      console.error('❌ Short-term rate limit would be exceeded:', {
        ip,
        consumedPoints: shortTermStatus.consumedPoints,
        resetInSeconds: resetTime
      });
      
      res.status(429).json({
        error: 'Too many registration attempts',
        message: `登録の間隔が短すぎます。${resetTime}秒後に再試行してください。`,
        retryAfter: resetTime
      });
      return;
    }
    
    // 1日あたりの制限をチェック（消費せずに確認のみ）
    const dailyStatus = await registrationLimiter.get(ip);
    if (dailyStatus && dailyStatus.consumedPoints >= 3) {
      console.error('❌ Daily rate limit would be exceeded:', {
        ip,
        consumedPoints: dailyStatus.consumedPoints
      });
      
      res.status(429).json({
        error: 'Registration limit exceeded',
        message: '本日の登録制限に達しました。24時間後に再試行してください。'
      });
      return;
    }
    
    // レート制限チェックは通過、実際の消費は登録成功時に行う
    next();
  } catch (error) {
    console.error('Registration rate limit error:', error);
    next();
  }
};

// 登録成功時にレート制限をカウントする関数
export const consumeRegistrationLimit = async (ip: string): Promise<void> => {
  try {
    console.log('✅ Registration successful, consuming rate limit for IP:', ip);
    await shortTermLimiter.consume(ip);
    await registrationLimiter.consume(ip);
  } catch (error) {
    // すでにチェック済みなのでエラーは起きないはず
    console.error('Failed to consume registration limit:', error);
  }
};