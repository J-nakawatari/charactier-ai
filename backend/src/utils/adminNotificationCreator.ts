/**
 * 管理者向け自動通知作成ユーティリティ
 * システムが自動的に管理者向けお知らせを作成する機能
 */

import { NotificationModel } from '../models/NotificationModel';
import { AdminModel } from '../models/AdminModel';

// システムユーザーID（自動通知用）
let SYSTEM_ADMIN_ID: string | null = null;

// システム管理者アカウントを取得または作成
async function getSystemAdminId(): Promise<string> {
  if (SYSTEM_ADMIN_ID) {
    return SYSTEM_ADMIN_ID;
  }

  // システム管理者を探す
  let systemAdmin = await AdminModel.findOne({ email: 'system@charactier-ai.com' });
  
  if (!systemAdmin) {
    // システム管理者が存在しない場合は作成
    systemAdmin = new AdminModel({
      email: 'system@charactier-ai.com',
      name: 'System',
      role: 'super',
      isActive: true
    });
    await systemAdmin.save();
  }

  SYSTEM_ADMIN_ID = systemAdmin._id.toString();
  return SYSTEM_ADMIN_ID;
}

interface CreateAdminNotificationOptions {
  type: 'warning' | 'urgent' | 'info';
  titleJa: string;
  titleEn: string;
  messageJa: string;
  messageEn: string;
  isPinned?: boolean;
  priority?: number;
}

/**
 * 管理者向け自動通知を作成
 */
export async function createAdminNotification(options: CreateAdminNotificationOptions): Promise<void> {
  try {
    const systemAdminId = await getSystemAdminId();

    const notification = new NotificationModel({
      title: {
        ja: options.titleJa,
        en: options.titleEn
      },
      message: {
        ja: options.messageJa,
        en: options.messageEn
      },
      type: options.type,
      isActive: true,
      isPinned: options.isPinned || false,
      priority: options.priority || 0,
      targetCondition: {
        type: 'all' // 全管理者に通知（今後管理者向け条件を追加可能）
      },
      validFrom: new Date(),
      totalTargetUsers: 0, // 管理者数は別途計算
      totalViews: 0,
      totalReads: 0,
      createdBy: systemAdminId
    });

    await notification.save();
    console.log('✅ 管理者向け自動通知を作成しました:', options.titleJa);
  } catch (error) {
    console.error('❌ 管理者向け自動通知の作成に失敗:', error);
  }
}

/**
 * 禁止用語検出通知
 */
export async function createBlockedWordNotification(
  userId: string, 
  username: string, 
  detectedWord: string
): Promise<void> {
  await createAdminNotification({
    type: 'warning',
    titleJa: '禁止用語検出',
    titleEn: 'Blocked Word Detected',
    messageJa: `ユーザー「${username}」(ID: ${userId})のメッセージで禁止用語「${detectedWord}」が検出されました。`,
    messageEn: `Blocked word "${detectedWord}" detected in message from user "${username}" (ID: ${userId}).`,
    isPinned: true,
    priority: 80
  });
}

/**
 * 大量トークン消費アラート
 */
export async function createHighTokenUsageAlert(
  userId: string, 
  username: string, 
  tokenAmount: number, 
  timeWindow: string
): Promise<void> {
  await createAdminNotification({
    type: 'warning',
    titleJa: '大量トークン消費検出',
    titleEn: 'High Token Usage Detected',
    messageJa: `ユーザー「${username}」(ID: ${userId})が${timeWindow}で${tokenAmount.toLocaleString()}トークンを消費しました。`,
    messageEn: `User "${username}" (ID: ${userId}) consumed ${tokenAmount.toLocaleString()} tokens in ${timeWindow}.`,
    isPinned: false,
    priority: 60
  });
}

/**
 * エラー率上昇通知
 */
export async function createErrorRateAlert(
  errorType: string, 
  errorCount: number, 
  timeWindow: string
): Promise<void> {
  await createAdminNotification({
    type: 'urgent',
    titleJa: 'システムエラー率上昇',
    titleEn: 'System Error Rate Increase',
    messageJa: `${timeWindow}で「${errorType}」エラーが${errorCount}件発生しています。システムの確認が必要です。`,
    messageEn: `${errorCount} "${errorType}" errors occurred in ${timeWindow}. System check required.`,
    isPinned: true,
    priority: 90
  });
}

/**
 * IP大量リクエスト検出通知
 */
export async function createIPRateLimitAlert(
  ipAddress: string, 
  requestCount: number, 
  timeWindow: string
): Promise<void> {
  await createAdminNotification({
    type: 'warning',
    titleJa: '大量リクエスト検出',
    titleEn: 'High Request Rate Detected',
    messageJa: `IP「${ipAddress}」から${timeWindow}で${requestCount}件のリクエストが発生しました。`,
    messageEn: `${requestCount} requests from IP "${ipAddress}" in ${timeWindow}.`,
    isPinned: false,
    priority: 70
  });
}