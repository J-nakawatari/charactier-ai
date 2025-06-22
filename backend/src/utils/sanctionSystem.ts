import mongoose from 'mongoose';
import { ViolationRecordModel, IViolationRecord } from '../models/ViolationRecord';
import { UserModel } from '../models/UserModel';
import { NotificationModel } from '../models/NotificationModel';

// 段階的制裁ルール定義
export const SANCTION_RULES = {
  RECORD_ONLY: { min: 1, max: 4 },     // 1〜4回目: 記録のみ
  WARNING: { level: 5 },               // 5回目: 警告
  CHAT_SUSPENSION: { level: 6 },       // 6回目: 24時間チャット停止
  ACCOUNT_SUSPENSION: { level: 7 },    // 7回目: 7日間アカウント停止
  BAN: { level: 8 }                    // 8回目以降: 無期限停止
};

export const SUSPENSION_PERIODS = {
  CHAT_SUSPENSION: 24 * 60 * 60 * 1000,      // 24時間
  ACCOUNT_SUSPENSION: 7 * 24 * 60 * 60 * 1000  // 7日間
};

export interface ViolationData {
  userId: mongoose.Types.ObjectId;
  type: 'blocked_word' | 'openai_moderation';
  originalMessage: string;
  violationReason: string;
  detectedWords?: string[];
  moderationCategories?: any;
  severity?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface SanctionResult {
  sanctionAction: string | null;
  message: string | null;
  violationCount: number;
  accountStatus: string;
  suspensionEndDate: Date | null;
}

export interface ChatPermissionResult {
  allowed: boolean;
  reason: string | null;
  message: string | null;
}

/**
 * 違反記録を作成
 */
export async function recordViolation(violationData: ViolationData): Promise<IViolationRecord> {
  const {
    userId,
    type,
    originalMessage,
    violationReason,
    detectedWords = [],
    moderationCategories = null,
    severity = 1,
    ipAddress = null,
    userAgent = null
  } = violationData;

  const violation = new ViolationRecordModel({
    userId,
    violationType: type,
    messageContent: originalMessage,
    reason: violationReason,
    detectedWord: detectedWords[0],
    moderationCategories,
    severityLevel: severity,
    ipAddress,
    userAgent,
    timestamp: new Date()
  });

  await violation.save();
  
  // 現在の違反件数を確認
  const totalViolations = await ViolationRecordModel.countDocuments({ userId });
  console.log(`📝 違反記録作成: ユーザー${userId}, タイプ:${type}, 理由:${violationReason}`);
  console.log(`📊 ユーザーの総違反件数: ${totalViolations}件`);
  
  return violation;
}

/**
 * ユーザーの制裁レベルを判定・適用
 */
export async function applySanction(userId: mongoose.Types.ObjectId): Promise<SanctionResult> {
  // ユーザー情報を取得
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  // 違反回数を取得（すべての違反記録をカウント）
  const violationCount = await ViolationRecordModel.countDocuments({ userId });
  
  // ユーザーの違反回数を更新（既に記録済みの違反も含めて正確にカウント）
  user.violationCount = violationCount;
  user.lastViolationDate = new Date();

  const currentViolationCount = user.violationCount;
  let sanctionAction: string | null = null;
  let message: string | null = null;

  console.log(`⚖️ 制裁判定開始: ユーザー${userId}, 違反回数:${currentViolationCount}`);
  console.log(`📊 ViolationRecordから取得した違反回数: ${violationCount}`);

  // 段階的制裁の判定
  if (currentViolationCount >= SANCTION_RULES.RECORD_ONLY.min && currentViolationCount <= SANCTION_RULES.RECORD_ONLY.max) {
    // 1〜4回目: 記録のみ
    sanctionAction = 'record_only';
    message = null;
    console.log(`📝 記録のみ: ${currentViolationCount}回目の違反`);
    
  } else if (currentViolationCount === SANCTION_RULES.WARNING.level) {
    // 5回目: 警告
    user.accountStatus = 'warned';
    user.warningCount = (user.warningCount || 0) + 1;
    sanctionAction = 'warning';
    message = '不適切な発言が検出されました。今後お気をつけください。';
    console.log(`⚠️ 警告発令: ${currentViolationCount}回目の違反`);
    
  } else if (currentViolationCount === SANCTION_RULES.CHAT_SUSPENSION.level) {
    // 6回目: 24時間チャット停止
    user.accountStatus = 'chat_suspended';
    user.suspensionEndDate = new Date(Date.now() + SUSPENSION_PERIODS.CHAT_SUSPENSION);
    sanctionAction = 'chat_suspension';
    message = '不適切な発言により、24時間チャット機能を停止いたします。';
    console.log(`🚫 チャット停止: ${currentViolationCount}回目の違反, 解除日時:${user.suspensionEndDate}`);
    
  } else if (currentViolationCount === SANCTION_RULES.ACCOUNT_SUSPENSION.level) {
    // 7回目: 7日間アカウント停止
    user.accountStatus = 'account_suspended';
    user.suspensionEndDate = new Date(Date.now() + SUSPENSION_PERIODS.ACCOUNT_SUSPENSION);
    sanctionAction = 'account_suspension';
    message = '重度の不適切な発言により、7日間アカウントを停止いたします。';
    console.log(`⛔ アカウント停止: ${currentViolationCount}回目の違反, 解除日時:${user.suspensionEndDate}`);
    
  } else if (currentViolationCount >= SANCTION_RULES.BAN.level) {
    // 8回目以降: 無期限停止
    user.accountStatus = 'banned';
    user.suspensionEndDate = null;
    user.banReason = `${currentViolationCount}回の不適切発言により永久停止`;
    sanctionAction = 'ban';
    message = '重度かつ継続的な不適切発言により、アカウントを永久停止いたします。';
    console.log(`🔒 永久停止: ${currentViolationCount}回目の違反`);
  }

  await user.save();

  // 通知作成（記録のみ以外の場合）
  if (sanctionAction !== 'record_only') {
    try {
      await NotificationModel.create({
        type: 'violation',
        title: '違反行為の検出',
        message: message || `違反回数: ${currentViolationCount}回`,
        relatedUserId: userId,
        isRead: false
      });
      console.log(`📢 通知作成: ${sanctionAction} (ユーザー: ${user.name})`);
    } catch (notificationError) {
      console.error('📢 通知作成エラー:', notificationError);
    }
  }

  return {
    sanctionAction,
    message,
    violationCount: currentViolationCount,
    accountStatus: user.accountStatus,
    suspensionEndDate: user.suspensionEndDate
  };
}

/**
 * ユーザーがチャット可能かチェック
 */
export function checkChatPermission(user: any): ChatPermissionResult {
  const now = new Date();
  
  console.log(`🔍 チャット権限チェック: ユーザー${user._id}, アカウント状態:${user.accountStatus}`);
  
  // BANされているかチェック
  if (user.accountStatus === 'banned') {
    console.log(`🚫 BANユーザー検出: ${user._id}`);
    return {
      allowed: false,
      reason: 'account_banned',
      message: 'アカウントが永久停止されています。'
    };
  }
  
  // アカウント停止中かチェック
  if (user.accountStatus === 'account_suspended') {
    if (user.suspensionEndDate && now < user.suspensionEndDate) {
      const remainingHours = Math.ceil((user.suspensionEndDate.getTime() - now.getTime()) / (60 * 60 * 1000));
      return {
        allowed: false,
        reason: 'account_suspended',
        message: `アカウントが停止中です。解除まで約${remainingHours}時間お待ちください。`
      };
    } else {
      // 停止期間が過ぎている場合は自動解除
      user.accountStatus = 'active';
      user.suspensionEndDate = null;
      user.save();
    }
  }
  
  // チャット停止中かチェック
  if (user.accountStatus === 'chat_suspended') {
    if (user.suspensionEndDate && now < user.suspensionEndDate) {
      const remainingHours = Math.ceil((user.suspensionEndDate.getTime() - now.getTime()) / (60 * 60 * 1000));
      return {
        allowed: false,
        reason: 'chat_suspended',
        message: `チャット機能が停止中です。解除まで約${remainingHours}時間お待ちください。`
      };
    } else {
      // 停止期間が過ぎている場合は自動解除
      user.accountStatus = 'active';
      user.suspensionEndDate = null;
      user.save();
    }
  }
  
  return {
    allowed: true,
    reason: null,
    message: null
  };
}

/**
 * 管理者による制裁解除
 */
export async function liftSanction(userId: mongoose.Types.ObjectId, adminId: mongoose.Types.ObjectId): Promise<any> {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  const previousStatus = user.accountStatus;
  
  // 制裁解除
  user.accountStatus = 'active';
  user.suspensionEndDate = null;
  user.banReason = null;
  
  await user.save();
  
  console.log(`🔓 制裁解除: ユーザー${userId}, 前のステータス:${previousStatus}, 管理者:${adminId}`);
  
  return {
    success: true,
    previousStatus,
    message: '制裁が解除されました'
  };
}

/**
 * ユーザーの違反履歴を取得
 */
export async function getViolationHistory(userId: mongoose.Types.ObjectId, limit: number = 20) {
  return await ViolationRecordModel.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
}

/**
 * ユーザーの違反統計を取得
 */
export async function getViolationStats(userId: mongoose.Types.ObjectId): Promise<any> {
  const stats = await ViolationRecordModel.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { 
      $group: { 
        _id: '$violationType', 
        count: { $sum: 1 },
        avgSeverity: { $avg: '$severityLevel' }
      } 
    }
  ]);

  const totalViolations = await ViolationRecordModel.countDocuments({ userId: new mongoose.Types.ObjectId(userId) });

  return {
    violationRecords: stats,
    totalViolations: totalViolations
  };
}