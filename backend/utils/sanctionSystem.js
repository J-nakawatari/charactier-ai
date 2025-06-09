const ViolationRecord = require('../models/ViolationRecord');
const User = require('../models/User');

// 制裁レベル設定
const SANCTION_LEVELS = {
  1: { type: 'record_only', duration: 0, description: '記録のみ' },
  2: { type: 'record_only', duration: 0, description: '記録のみ' },
  3: { type: 'record_only', duration: 0, description: '記録のみ' },
  4: { type: 'record_only', duration: 0, description: '記録のみ' },
  5: { type: 'warning', duration: 0, description: '警告発令' },
  6: { type: 'chat_suspension', duration: 24 * 60 * 60 * 1000, description: '24時間チャット停止' }, // 24時間
  7: { type: 'account_suspension', duration: 7 * 24 * 60 * 60 * 1000, description: '7日間アカウント停止' }, // 7日
  8: { type: 'permanent_ban', duration: -1, description: '無期限停止' }
};

/**
 * 違反記録を保存
 * @param {String} userId - ユーザーID
 * @param {String} violationType - 違反タイプ ('blocked_word' | 'openai_moderation')
 * @param {Object} details - 違反詳細
 * @param {String} details.detectedWord - 検出された禁止用語
 * @param {String} details.reason - 違反理由
 * @param {String} details.messageContent - 違反メッセージ内容
 * @param {String} details.ipAddress - IPアドレス
 * @param {String} details.userAgent - ユーザーエージェント
 * @param {Object} details.moderationCategories - OpenAI Moderation結果
 * @returns {Promise<Object>} 保存された違反記録
 */
async function recordViolation(userId, violationType, details) {
  try {
    const violation = new ViolationRecord({
      userId,
      violationType,
      detectedWord: details.detectedWord || null,
      reason: details.reason,
      messageContent: details.messageContent,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      moderationCategories: details.moderationCategories || {}
    });

    await violation.save();
    
    console.log(`🚫 違反記録: User ${userId}, Type: ${violationType}, Reason: ${details.reason}`);
    
    return violation;
  } catch (error) {
    console.error('❌ 違反記録保存エラー:', error);
    throw error;
  }
}

/**
 * ユーザーに制裁を適用
 * @param {String} userId - ユーザーID
 * @returns {Promise<Object>} 適用された制裁情報
 */
async function applySanction(userId) {
  try {
    // 現在の違反回数を取得
    const violationCount = await ViolationRecord.getViolationCount(userId);
    
    // 制裁レベル判定
    const sanctionLevel = Math.min(violationCount, 8);
    const sanction = SANCTION_LEVELS[sanctionLevel];
    
    if (!sanction) {
      return { applied: false, reason: 'No sanction required' };
    }

    // ユーザー情報を更新
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // 制裁期間計算
    let sanctionExpiresAt = null;
    if (sanction.duration > 0) {
      sanctionExpiresAt = new Date(Date.now() + sanction.duration);
    } else if (sanction.duration === -1) {
      sanctionExpiresAt = new Date('2099-12-31'); // 実質無期限
    }

    // ユーザーの制裁状態を更新
    user.sanctionStatus = {
      isActive: sanction.type !== 'record_only',
      type: sanction.type,
      level: sanctionLevel,
      appliedAt: new Date(),
      expiresAt: sanctionExpiresAt,
      violationCount: violationCount,
      reason: sanction.description
    };

    await user.save();

    console.log(`⚖️ 制裁適用: User ${userId}, Level ${sanctionLevel}, Type: ${sanction.type}`);

    return {
      applied: true,
      sanctionLevel,
      sanctionType: sanction.type,
      description: sanction.description,
      expiresAt: sanctionExpiresAt,
      violationCount
    };

  } catch (error) {
    console.error('❌ 制裁適用エラー:', error);
    throw error;
  }
}

/**
 * チャット権限確認
 * @param {String} userId - ユーザーID
 * @returns {Promise<Object>} チャット権限情報
 */
async function checkChatPermission(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // 制裁状態確認
    if (!user.sanctionStatus || !user.sanctionStatus.isActive) {
      return { allowed: true };
    }

    const sanction = user.sanctionStatus;
    const now = new Date();

    // 制裁期間確認
    if (sanction.expiresAt && now > sanction.expiresAt) {
      // 制裁期間終了 - 自動解除
      user.sanctionStatus.isActive = false;
      user.sanctionStatus.autoLiftedAt = now;
      await user.save();
      
      console.log(`🔓 制裁自動解除: User ${userId}`);
      return { allowed: true };
    }

    // チャット制限の確認
    if (sanction.type === 'chat_suspension' || 
        sanction.type === 'account_suspension' || 
        sanction.type === 'permanent_ban') {
      return {
        allowed: false,
        reason: sanction.reason,
        sanctionType: sanction.type,
        expiresAt: sanction.expiresAt,
        violationCount: sanction.violationCount
      };
    }

    return { allowed: true };

  } catch (error) {
    console.error('❌ チャット権限確認エラー:', error);
    throw error;
  }
}

/**
 * 管理者による制裁解除
 * @param {String} userId - 対象ユーザーID
 * @param {String} adminId - 管理者ID
 * @param {String} reason - 解除理由
 * @returns {Promise<Object>} 解除結果
 */
async function liftSanction(userId, adminId, reason = '管理者による解除') {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.sanctionStatus || !user.sanctionStatus.isActive) {
      return { success: false, reason: 'No active sanction to lift' };
    }

    // 制裁解除
    const previousSanction = { ...user.sanctionStatus };
    user.sanctionStatus.isActive = false;
    user.sanctionStatus.liftedBy = adminId;
    user.sanctionStatus.liftedAt = new Date();
    user.sanctionStatus.liftReason = reason;

    await user.save();

    console.log(`🔓 制裁解除: User ${userId} by Admin ${adminId}, Reason: ${reason}`);

    return {
      success: true,
      previousSanction,
      liftedAt: new Date(),
      liftedBy: adminId,
      reason
    };

  } catch (error) {
    console.error('❌ 制裁解除エラー:', error);
    throw error;
  }
}

/**
 * ユーザーの制裁状況取得
 * @param {String} userId - ユーザーID
 * @returns {Promise<Object>} 制裁状況
 */
async function getSanctionStatus(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const violationCount = await ViolationRecord.getViolationCount(userId);
    const recentViolations = await ViolationRecord.getLatestViolations(userId, 5);

    return {
      userId,
      violationCount,
      currentSanction: user.sanctionStatus || null,
      recentViolations,
      nextSanctionLevel: Math.min(violationCount + 1, 8),
      nextSanctionInfo: SANCTION_LEVELS[Math.min(violationCount + 1, 8)] || null
    };

  } catch (error) {
    console.error('❌ 制裁状況取得エラー:', error);
    throw error;
  }
}

/**
 * 違反記録リセット（管理者用）
 * @param {String} userId - ユーザーID
 * @param {String} adminId - 管理者ID
 * @returns {Promise<Object>} リセット結果
 */
async function resetViolations(userId, adminId) {
  try {
    // 違反記録を解決済みにマーク
    await ViolationRecord.updateMany(
      { userId, isResolved: false },
      { 
        isResolved: true, 
        resolvedBy: adminId, 
        resolvedAt: new Date() 
      }
    );

    // 制裁状態をリセット
    await User.findByIdAndUpdate(userId, {
      $unset: { sanctionStatus: 1 }
    });

    console.log(`🔄 違反記録リセット: User ${userId} by Admin ${adminId}`);

    return {
      success: true,
      resetAt: new Date(),
      resetBy: adminId
    };

  } catch (error) {
    console.error('❌ 違反記録リセットエラー:', error);
    throw error;
  }
}

module.exports = {
  recordViolation,
  applySanction,
  checkChatPermission,
  liftSanction,
  getSanctionStatus,
  resetViolations,
  SANCTION_LEVELS
};