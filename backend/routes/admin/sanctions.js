const express = require('express');
const router = express.Router();
const auth = require('../../../data/ai-character-feature-simplify-terms-privacy-pages/backend/middleware/auth');
const ViolationRecord = require('../../models/ViolationRecord');
const User = require('../../../data/ai-character-feature-simplify-terms-privacy-pages/backend/models/User');
const { 
  getSanctionStatus, 
  liftSanction, 
  resetViolations,
  SANCTION_LEVELS 
} = require('../../utils/sanctionSystem');

// 管理者権限チェックミドルウェア
const adminAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: '認証が必要です',
        code: 'UNAUTHORIZED'
      });
    }

    // ユーザー情報取得
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'ユーザーが見つかりません',
        code: 'USER_NOT_FOUND'
      });
    }

    // 管理者権限確認
    if (!user.isAdmin) {
      return res.status(403).json({
        error: '管理者権限が必要です',
        code: 'ADMIN_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({
      error: '認証エラーが発生しました',
      code: 'AUTH_ERROR'
    });
  }
};

// GET /admin/sanctions/users - 制裁対象ユーザー一覧取得
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all' } = req.query;
    const skip = (page - 1) * limit;

    // 制裁状況によるフィルタ
    let userFilter = {};
    if (status === 'active') {
      userFilter['sanctionStatus.isActive'] = true;
    } else if (status === 'inactive') {
      userFilter['sanctionStatus.isActive'] = false;
    }

    // 制裁対象ユーザー取得
    const users = await User.find(userFilter)
      .select('email username sanctionStatus createdAt lastLoginAt')
      .sort({ 'sanctionStatus.appliedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 各ユーザーの違反回数を取得
    const usersWithViolations = await Promise.all(
      users.map(async (user) => {
        const violationCount = await ViolationRecord.getViolationCount(user._id);
        const latestViolations = await ViolationRecord.getLatestViolations(user._id, 3);
        
        return {
          id: user._id,
          email: user.email,
          username: user.username,
          violationCount,
          currentSanction: user.sanctionStatus || null,
          latestViolations: latestViolations.map(v => ({
            id: v._id,
            type: v.violationType,
            reason: v.reason,
            timestamp: v.timestamp,
            detectedWord: v.detectedWord
          })),
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        };
      })
    );

    // 総数取得
    const totalUsers = await User.countDocuments(userFilter);

    res.json({
      users: usersWithViolations,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalUsers / limit),
        limit: parseInt(limit),
        totalUsers
      },
      filters: { status }
    });

  } catch (error) {
    console.error('Get sanctioned users error:', error);
    res.status(500).json({
      error: '制裁対象ユーザー一覧の取得中にエラーが発生しました',
      message: error.message,
      code: 'GET_USERS_ERROR'
    });
  }
});

// GET /admin/sanctions/users/:userId/violations - 特定ユーザーの違反履歴取得
router.get('/users/:userId/violations', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // ユーザー存在確認
    const user = await User.findById(userId)
      .select('email username sanctionStatus');
    
    if (!user) {
      return res.status(404).json({
        error: 'ユーザーが見つかりません',
        code: 'USER_NOT_FOUND'
      });
    }

    // 違反履歴取得
    const violations = await ViolationRecord.find({ userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 制裁状況取得
    const sanctionStatus = await getSanctionStatus(userId);

    // 総数取得
    const totalViolations = await ViolationRecord.countDocuments({ userId });

    res.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        currentSanction: user.sanctionStatus
      },
      violations: violations.map(v => ({
        id: v._id,
        type: v.violationType,
        detectedWord: v.detectedWord,
        reason: v.reason,
        severityLevel: v.severityLevel,
        messageContent: v.messageContent.substring(0, 200), // 最初の200文字のみ
        ipAddress: v.ipAddress,
        timestamp: v.timestamp,
        isResolved: v.isResolved,
        resolvedBy: v.resolvedBy,
        resolvedAt: v.resolvedAt,
        moderationCategories: v.moderationCategories
      })),
      sanctionStatus,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalViolations / limit),
        limit: parseInt(limit),
        totalViolations
      }
    });

  } catch (error) {
    console.error('Get user violations error:', error);
    res.status(500).json({
      error: 'ユーザー違反履歴の取得中にエラーが発生しました',
      message: error.message,
      code: 'GET_VIOLATIONS_ERROR'
    });
  }
});

// POST /admin/sanctions/users/:userId/lift - 制裁解除
router.post('/users/:userId/lift', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    // ユーザー存在確認
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'ユーザーが見つかりません',
        code: 'USER_NOT_FOUND'
      });
    }

    // 制裁解除実行
    const result = await liftSanction(userId, adminId, reason || '管理者による解除');

    if (!result.success) {
      return res.status(400).json({
        error: result.reason,
        code: 'LIFT_FAILED'
      });
    }

    res.json({
      success: true,
      message: '制裁が解除されました',
      result: {
        userId,
        adminId,
        liftedAt: result.liftedAt,
        reason: result.reason,
        previousSanction: result.previousSanction
      }
    });

  } catch (error) {
    console.error('Lift sanction error:', error);
    res.status(500).json({
      error: '制裁解除中にエラーが発生しました',
      message: error.message,
      code: 'LIFT_SANCTION_ERROR'
    });
  }
});

// POST /admin/sanctions/users/:userId/reset-violations - 違反記録リセット
router.post('/users/:userId/reset-violations', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    // ユーザー存在確認
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'ユーザーが見つかりません',
        code: 'USER_NOT_FOUND'
      });
    }

    // 違反記録リセット実行
    const result = await resetViolations(userId, adminId);

    res.json({
      success: true,
      message: '違反記録がリセットされました',
      result: {
        userId,
        adminId,
        resetAt: result.resetAt
      }
    });

  } catch (error) {
    console.error('Reset violations error:', error);
    res.status(500).json({
      error: '違反記録リセット中にエラーが発生しました',
      message: error.message,
      code: 'RESET_VIOLATIONS_ERROR'
    });
  }
});

// GET /admin/sanctions/stats - 制裁統計情報取得
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    // 時間範囲の計算
    let timeLimit;
    switch (timeframe) {
      case '1h':
        timeLimit = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeLimit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        timeLimit = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // 統計データ取得
    const [
      violationStats,
      totalViolations,
      activeUsers,
      sanctionedUsers,
      recentViolations
    ] = await Promise.all([
      ViolationRecord.getViolationStats(timeLimit.getTime()),
      ViolationRecord.countDocuments({ 
        timestamp: { $gte: timeLimit },
        isResolved: false 
      }),
      User.countDocuments({}),
      User.countDocuments({ 'sanctionStatus.isActive': true }),
      ViolationRecord.find({ timestamp: { $gte: timeLimit } })
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('userId', 'email username')
    ]);

    // 制裁レベル別統計
    const sanctionLevelStats = await User.aggregate([
      { $match: { 'sanctionStatus.isActive': true } },
      { 
        $group: {
          _id: '$sanctionStatus.level',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      timeframe,
      overview: {
        totalViolations,
        activeUsers,
        sanctionedUsers,
        sanctionRate: activeUsers > 0 ? (sanctionedUsers / activeUsers * 100).toFixed(2) : 0
      },
      violationStats: violationStats.map(stat => ({
        type: stat._id,
        count: stat.count,
        avgSeverity: stat.avgSeverity?.toFixed(2) || 0
      })),
      sanctionLevels: SANCTION_LEVELS,
      sanctionLevelStats: sanctionLevelStats.map(stat => ({
        level: stat._id,
        count: stat.count,
        description: SANCTION_LEVELS[stat._id]?.description || 'Unknown'
      })),
      recentViolations: recentViolations.map(v => ({
        id: v._id,
        userId: v.userId?._id,
        userEmail: v.userId?.email,
        type: v.violationType,
        reason: v.reason,
        timestamp: v.timestamp,
        severity: v.severityLevel
      }))
    });

  } catch (error) {
    console.error('Get sanctions stats error:', error);
    res.status(500).json({
      error: '制裁統計情報の取得中にエラーが発生しました',
      message: error.message,
      code: 'GET_STATS_ERROR'
    });
  }
});

// GET /admin/sanctions/levels - 制裁レベル情報取得
router.get('/levels', auth, adminAuth, async (req, res) => {
  try {
    res.json({
      sanctionLevels: SANCTION_LEVELS,
      description: '違反回数に応じて自動適用される制裁レベルの詳細情報'
    });
  } catch (error) {
    console.error('Get sanction levels error:', error);
    res.status(500).json({
      error: '制裁レベル情報の取得中にエラーが発生しました',
      code: 'GET_LEVELS_ERROR'
    });
  }
});

module.exports = router;