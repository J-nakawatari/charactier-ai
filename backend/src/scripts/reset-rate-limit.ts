import { RateLimiterMemory } from 'rate-limiter-flexible';

// レート制限をリセットするスクリプト
async function resetRateLimit(ip?: string) {
  console.log('🔄 レート制限リセットスクリプト');
  
  // 短期間の連続登録を防ぐリミッター
  const shortTermLimiter = new RateLimiterMemory({
    keyPrefix: 'registration_short',
    points: 1,
    duration: 300,
    blockDuration: 300,
  });

  // 日次制限のリミッター
  const registrationLimiter = new RateLimiterMemory({
    keyPrefix: 'registration',
    points: 3,
    duration: 86400,
    blockDuration: 86400,
  });

  if (ip) {
    // 特定のIPアドレスのレート制限をリセット
    try {
      await shortTermLimiter.delete(ip);
      await registrationLimiter.delete(ip);
      console.log(`✅ IP ${ip} のレート制限をリセットしました`);
    } catch (error) {
      console.error(`❌ IP ${ip} のレート制限リセットに失敗:`, error);
    }
  } else {
    console.log('⚠️  IPアドレスを指定してください');
    console.log('使用方法: npm run reset-rate-limit -- <IP_ADDRESS>');
  }
}

// コマンドライン引数からIPアドレスを取得
const ip = process.argv[2];
resetRateLimit(ip);