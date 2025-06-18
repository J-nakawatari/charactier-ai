import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { ViolationRecordModel } from '../models/ViolationRecord';
import { UserModel } from '../models/UserModel';
import { liftSanction, getViolationHistory, getViolationStats } from '../utils/sanctionSystem';
import mongoose from 'mongoose';

const router: Router = Router();

// 管理者認証ミドルウェア
const authenticateAdmin = (req: AuthRequest, res: Response, next: any): void => {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: '管理者権限が必要です' });
    return;
  }
  next();
};

// 違反統計取得
router.get('/violation-stats', authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
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
    console.error('❌ Error fetching violation stats:', error);
    res.status(500).json({ error: '統計データの取得に失敗しました' });
  }
});

// 最近の違反記録取得
router.get('/recent-violations', authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
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
    console.error('❌ Error fetching recent violations:', error);
    res.status(500).json({ error: '違反記録の取得に失敗しました' });
  }
});

// 制裁中ユーザー一覧
router.get('/sanctioned-users', authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await UserModel.find({
      accountStatus: { 
        $in: ['warned', 'chat_suspended', 'account_suspended', 'banned']
      }
    }).select('name email accountStatus suspensionEndDate violationCount lastViolationDate');
    
    res.json({
      success: true,
      users
    });
    
  } catch (error) {
    console.error('❌ Error fetching sanctioned users:', error);
    res.status(500).json({ error: '制裁中ユーザーの取得に失敗しました' });
  }
});

// ユーザーの違反履歴取得
router.get('/user/:userId/violations', authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: '無効なユーザーIDです' });
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
    console.error('❌ Error fetching user violations:', error);
    res.status(500).json({ error: 'ユーザー違反履歴の取得に失敗しました' });
  }
});

// 制裁解除
router.post('/lift-sanction/:userId', authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: '無効なユーザーIDです' });
      return;
    }
    
    const result = await liftSanction(
      new mongoose.Types.ObjectId(userId),
      new mongoose.Types.ObjectId(req.user._id)
    );
    
    res.json({
      success: true,
      message: '制裁を解除しました',
      result
    });
    
  } catch (error) {
    console.error('❌ Error lifting sanction:', error);
    res.status(500).json({ error: '制裁解除に失敗しました' });
  }
});

// 違反記録の詳細検索
router.get('/violations/search', authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
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
    
    if (userId && mongoose.Types.ObjectId.isValid(userId as string)) {
      query.userId = new mongoose.Types.ObjectId(userId as string);
    }
    
    if (violationType) {
      query.violationType = violationType;
    }
    
    if (severity) {
      query.severityLevel = parseInt(severity as string);
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
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
    console.error('❌ Error searching violations:', error);
    res.status(500).json({ error: '違反記録の検索に失敗しました' });
  }
});

export default router;