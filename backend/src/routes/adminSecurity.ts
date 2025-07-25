import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { ViolationRecordModel } from '../models/ViolationRecord';
import { UserModel } from '../models/UserModel';
import { liftSanction, getViolationHistory, getViolationStats } from '../utils/sanctionSystem';
import mongoose from 'mongoose';
import { sendErrorResponse, ClientErrorCode } from '../utils/errorResponse';
import log from '../utils/logger';
import { createRateLimiter } from '../middleware/rateLimiter';
import { verifyCsrfToken } from '../middleware/csrf';

const router: Router = Router();

// セキュリティ管理用のレート制限（より厳しい制限）
const securityRateLimit = createRateLimiter('admin');

// 管理者認証ミドルウェア
const authenticateAdmin = (req: AuthRequest, res: Response, next: any): void => {
  if (!req.admin) {
    sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin access required');
    return;
  }
  next();
};

// 違反統計取得
router.get('/violation-stats', securityRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const timeframe = parseInt(req.query.timeframe as string) || 24 * 60 * 60 * 1000; // デフォルト24時間
    
    // 違反タイプ別統計
    const stats = await ViolationRecordModel.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(Date.now() - timeframe) }
        }
      },
      {
        $group: {
          _id: '$violationType',
          count: { $sum: 1 },
          avgSeverity: { $avg: '$severityLevel' }
        }
      }
    ]);
    
    // 全体統計
    const totalStats = await ViolationRecordModel.aggregate([
      {
        $group: {
          _id: null,
          totalViolations: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          avgSeverity: { $avg: '$severityLevel' }
        }
      },
      {
        $project: {
          totalViolations: 1,
          uniqueUserCount: { $size: '$uniqueUsers' },
          avgSeverity: { $round: ['$avgSeverity', 2] }
        }
      }
    ]);
    
    // 制裁状況
    const sanctionStats = await UserModel.aggregate([
      {
        $match: {
          accountStatus: { $ne: 'active' }
        }
      },
      {
        $group: {
          _id: '$accountStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      violationStats: stats,
      totalStats: totalStats[0] || { totalViolations: 0, uniqueUserCount: 0, avgSeverity: 0 },
      sanctionStats,
      timeframe
    });
    
  } catch (error) {
    log.error('Error fetching violation stats', error, {
      adminId: req.admin?._id,
      timeframe: req.query.timeframe
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 最近の違反記録取得
router.get('/recent-violations', securityRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    const violations = await ViolationRecordModel.find()
      .populate('userId', 'name email accountStatus')
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    res.json({
      success: true,
      violations
    });
    
  } catch (error) {
    log.error('Error fetching recent violations', error, {
      adminId: req.admin?._id,
      limit: req.query.limit
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 制裁中ユーザー一覧
router.get('/sanctioned-users', securityRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await UserModel.find({
      accountStatus: { 
        $in: ['warned', 'chat_suspended', 'account_suspended', 'banned']
      },
      // 削除済みユーザーを除外（メールアドレスが deleted_ で始まるものも除外）
      email: { $not: /^deleted_/ },
      isActive: { $ne: false }
    }).select('name email accountStatus suspensionEndDate violationCount lastViolationDate');
    
    res.json({
      success: true,
      users
    });
    
  } catch (error) {
    log.error('Error fetching sanctioned users', error, {
      adminId: req.admin?._id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// ユーザーの違反履歴取得
router.get('/user/:userId/violations', securityRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      sendErrorResponse(res, 400, ClientErrorCode.INVALID_INPUT, 'Invalid user ID');
      return;
    }
    
    const violations = await getViolationHistory(new mongoose.Types.ObjectId(userId), limit);
    const stats = await getViolationStats(new mongoose.Types.ObjectId(userId));
    
    res.json({
      success: true,
      violations,
      stats
    });
    
  } catch (error) {
    log.error('Error fetching user violations', error, {
      adminId: req.admin?._id,
      userId: req.params.userId,
      limit: req.query.limit
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 制裁解除
router.post('/lift-sanction/:userId', securityRateLimit, authenticateToken, authenticateAdmin, verifyCsrfToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      sendErrorResponse(res, 400, ClientErrorCode.INVALID_INPUT, 'Invalid user ID');
      return;
    }
    
    const result = await liftSanction(
      new mongoose.Types.ObjectId(userId),
      new mongoose.Types.ObjectId(req.admin._id.toString())
    );
    
    res.json({
      success: true,
      message: '制裁を解除しました',
      result
    });
    
  } catch (error) {
    log.error('Error lifting sanction', error, {
      adminId: req.admin?._id,
      userId: req.params.userId
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 違反記録の詳細検索
router.get('/violations/search', securityRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      userId,
      violationType,
      severity,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;
    
    const query: any = {};
    
    // Validate and sanitize userId
    if (userId && mongoose.Types.ObjectId.isValid(userId as string)) {
      query.userId = { $eq: new mongoose.Types.ObjectId(userId as string) };
    }
    
    // Validate violationType from allowed values
    const allowedViolationTypes = ['inappropriate_content', 'spam', 'harassment', 'other'];
    if (violationType && allowedViolationTypes.includes(violationType as string)) {
      query.violationType = { $eq: violationType };
    }
    
    // Validate severity as integer
    if (severity) {
      const severityInt = parseInt(severity as string);
      if (!isNaN(severityInt) && severityInt >= 1 && severityInt <= 10) {
        query.severityLevel = { $eq: severityInt };
      }
    }
    
    // Validate date range
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        const start = new Date(startDate as string);
        if (!isNaN(start.getTime())) {
          query.timestamp.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate as string);
        if (!isNaN(end.getTime())) {
          query.timestamp.$lte = end;
        }
      }
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const [violations, total] = await Promise.all([
      ViolationRecordModel.find(query)
        .populate('userId', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      ViolationRecordModel.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      violations,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
    
  } catch (error) {
    log.error('Error searching violations', error, {
      adminId: req.admin?._id,
      query: req.query
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 違反記録のクリア（管理者のみ）
router.delete('/violations/clear', securityRateLimit, authenticateToken, authenticateAdmin, verifyCsrfToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.query; // 'all' または 'old'
    const { daysOld } = req.query; // 古い記録のみ削除する場合の日数
    
    let deleteQuery: any = {};
    
    if (type === 'old' && daysOld) {
      // 指定日数より古い記録のみ削除
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld as string));
      deleteQuery = { timestamp: { $lt: cutoffDate } };
    }
    // type === 'all' の場合は全削除（deleteQuery は空のまま）
    
    const result = await ViolationRecordModel.deleteMany(deleteQuery);
    
    log.info('Violation records cleared', {
      adminId: req.admin._id,
      type,
      daysOld,
      deletedCount: result.deletedCount
    });
    
    res.json({
      success: true,
      message: `${result.deletedCount}件の違反記録を削除しました`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    log.error('Error clearing violation records', error, {
      adminId: req.admin?._id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

export default router;