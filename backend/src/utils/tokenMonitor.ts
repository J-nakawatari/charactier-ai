/**
 * トークン使用量監視ユーティリティ
 * 大量トークン消費を検出して管理者に通知
 */

import { TokenUsage } from '../models/TokenUsage';
import { UserModel } from '../models/UserModel';
import { createHighTokenUsageAlert } from './adminNotificationCreator';

// 閾値設定
const TOKEN_THRESHOLDS = {
  // 1時間で10,000トークン以上
  HOURLY_LIMIT: 10000,
  HOURLY_WINDOW: 60 * 60 * 1000, // 1時間（ミリ秒）
  
  // 1日で50,000トークン以上
  DAILY_LIMIT: 50000,
  DAILY_WINDOW: 24 * 60 * 60 * 1000, // 24時間（ミリ秒）
};

// 最近通知したユーザーのキャッシュ（重複通知防止）
const notificationCache = new Set<string>();

/**
 * トークン使用量をチェックして閾値を超えた場合に通知
 */
export async function checkTokenUsage(userId: string, currentTokens: number): Promise<void> {
  try {
    const now = new Date();
    
    // 1時間以内の使用量をチェック
    const hourlyUsage = await getTokenUsageInWindow(userId, TOKEN_THRESHOLDS.HOURLY_WINDOW);
    if (hourlyUsage >= TOKEN_THRESHOLDS.HOURLY_LIMIT) {
      await notifyHighUsage(userId, hourlyUsage, '1時間');
    }
    
    // 24時間以内の使用量をチェック
    const dailyUsage = await getTokenUsageInWindow(userId, TOKEN_THRESHOLDS.DAILY_WINDOW);
    if (dailyUsage >= TOKEN_THRESHOLDS.DAILY_LIMIT) {
      await notifyHighUsage(userId, dailyUsage, '24時間');
    }
    
  } catch (error) {
    console.error('トークン使用量チェックエラー:', error);
  }
}

/**
 * 指定時間窓でのトークン使用量を取得
 */
async function getTokenUsageInWindow(userId: string, windowMs: number): Promise<number> {
  const since = new Date(Date.now() - windowMs);
  
  const usageRecords = await TokenUsage.find({
    userId: userId,
    timestamp: { $gte: since }
  });
  
  return usageRecords.reduce((total, record) => total + record.tokensUsed, 0);
}

/**
 * 大量使用通知を送信（重複防止付き）
 */
async function notifyHighUsage(userId: string, tokenAmount: number, timeWindow: string): Promise<void> {
  const cacheKey = `${userId}-${timeWindow}-${Math.floor(Date.now() / (60 * 60 * 1000))}`; // 1時間単位でキャッシュ
  
  // 重複通知防止
  if (notificationCache.has(cacheKey)) {
    return;
  }
  
  try {
    // ユーザー情報を取得
    const user = await UserModel.findById(userId);
    if (!user) {
      console.error('ユーザーが見つかりません:', userId);
      return;
    }
    
    const username = user.name || user.email || 'Unknown';
    
    // 管理者通知を作成
    await createHighTokenUsageAlert(userId, username, tokenAmount, timeWindow);
    
    // キャッシュに追加（1時間後に自動削除）
    notificationCache.add(cacheKey);
    setTimeout(() => {
      notificationCache.delete(cacheKey);
    }, 60 * 60 * 1000); // 1時間
    
    console.log(`✅ 大量トークン使用通知を送信: ${username} (${tokenAmount} tokens in ${timeWindow})`);
    
  } catch (error) {
    console.error('大量使用通知送信エラー:', error);
  }
}

/**
 * システム全体のトークン使用状況をチェック（定期実行用）
 */
export async function checkSystemTokenUsage(): Promise<void> {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - TOKEN_THRESHOLDS.HOURLY_WINDOW);
    
    // 過去1時間の高使用量ユーザーを検索
    const highUsageUsers = await TokenUsage.aggregate([
      {
        $match: {
          timestamp: { $gte: oneHourAgo }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalTokens: { $sum: '$tokensUsed' }
        }
      },
      {
        $match: {
          totalTokens: { $gte: TOKEN_THRESHOLDS.HOURLY_LIMIT }
        }
      }
    ]);
    
    // 各高使用量ユーザーに対して通知チェック
    for (const userUsage of highUsageUsers) {
      await notifyHighUsage(userUsage._id, userUsage.totalTokens, '1時間');
    }
    
  } catch (error) {
    console.error('システム全体トークン使用量チェックエラー:', error);
  }
}