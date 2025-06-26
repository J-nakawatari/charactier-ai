import crypto from 'crypto';
import { getRedisClient } from '../../lib/redis';
import log from '../utils/logger';

// Idempotency キーのプレフィックスと有効期限
const IDEMPOTENCY_PREFIX = 'stripe:idempotency:';
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24時間

/**
 * Idempotency キーを生成
 * @param userId ユーザーID
 * @param operation 操作の種類 (checkout_token, checkout_character, etc.)
 * @param uniqueId 一意性を保証するための追加ID（オプション）
 */
export function generateIdempotencyKey(
  userId: string, 
  operation: string, 
  uniqueId?: string
): string {
  const baseKey = `${userId}:${operation}`;
  const uniquePart = uniqueId || Date.now().toString();
  const hash = crypto.createHash('sha256')
    .update(`${baseKey}:${uniquePart}`)
    .digest('hex')
    .substring(0, 16);
  
  return `${operation}_${hash}_${Date.now()}`;
}

/**
 * Idempotency キーの使用状況を記録
 */
export async function recordIdempotencyKey(
  key: string, 
  result: any
): Promise<void> {
  try {
    const redis = await getRedisClient();
    const storageKey = `${IDEMPOTENCY_PREFIX}${key}`;
    
    // 結果をJSONとして保存
    await redis.set(
      storageKey, 
      JSON.stringify({
        result,
        timestamp: new Date().toISOString(),
        used: true
      }),
      { EX: IDEMPOTENCY_TTL }
    );
    
    log.info('Idempotency key recorded', { key, operation: key.split('_')[0] });
  } catch (error) {
    log.error('Failed to record idempotency key', error);
    // Redisエラーは無視して処理を続行
  }
}

/**
 * Idempotency キーの重複チェック
 */
export async function checkIdempotencyKey(key: string): Promise<{
  isDuplicate: boolean;
  previousResult?: any;
}> {
  try {
    const redis = await getRedisClient();
    const storageKey = `${IDEMPOTENCY_PREFIX}${key}`;
    
    const existingData = await redis.get(storageKey);
    if (existingData) {
      const parsed = JSON.parse(existingData);
      log.warn('Duplicate idempotency key detected', { 
        key, 
        originalTimestamp: parsed.timestamp 
      });
      
      return {
        isDuplicate: true,
        previousResult: parsed.result
      };
    }
    
    return { isDuplicate: false };
  } catch (error) {
    log.error('Failed to check idempotency key', error);
    // Redisエラーの場合は重複なしとして処理を続行
    return { isDuplicate: false };
  }
}

/**
 * リクエストからIdempotencyキーを取得または生成
 */
export function getOrCreateIdempotencyKey(
  headers: Record<string, any>,
  userId: string,
  operation: string,
  uniqueId?: string
): string {
  // ヘッダーから既存のキーを確認
  const headerKey = headers['idempotency-key'] || headers['x-idempotency-key'];
  
  if (headerKey && typeof headerKey === 'string') {
    // クライアントが提供したキーを使用
    return headerKey;
  }
  
  // 新しいキーを生成
  return generateIdempotencyKey(userId, operation, uniqueId);
}

/**
 * Stripe API呼び出しのラッパー（Idempotency対応）
 */
export async function stripeWithIdempotency<T>(
  idempotencyKey: string,
  stripeOperation: () => Promise<T>
): Promise<T> {
  // 重複チェック
  const duplicateCheck = await checkIdempotencyKey(idempotencyKey);
  if (duplicateCheck.isDuplicate && duplicateCheck.previousResult) {
    log.info('Returning cached result for idempotency key', { key: idempotencyKey });
    return duplicateCheck.previousResult as T;
  }
  
  try {
    // Stripe API呼び出し
    const result = await stripeOperation();
    
    // 結果を記録
    await recordIdempotencyKey(idempotencyKey, result);
    
    return result;
  } catch (error) {
    // エラーの場合もIdempotencyキーを記録（再試行時に同じエラーを返すため）
    await recordIdempotencyKey(idempotencyKey, { 
      error: true, 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
}

/**
 * Idempotency統計情報の取得
 */
export async function getIdempotencyStats(): Promise<{
  totalKeys: number;
  recentDuplicates: number;
}> {
  try {
    const redis = await getRedisClient();
    const keys = await redis.keys(`${IDEMPOTENCY_PREFIX}*`);
    
    let duplicates = 0;
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        const timestamp = new Date(parsed.timestamp).getTime();
        if (timestamp > oneHourAgo && parsed.used) {
          duplicates++;
        }
      }
    }
    
    return {
      totalKeys: keys.length,
      recentDuplicates: duplicates
    };
  } catch (error) {
    log.error('Failed to get idempotency stats', error);
    return { totalKeys: 0, recentDuplicates: 0 };
  }
}