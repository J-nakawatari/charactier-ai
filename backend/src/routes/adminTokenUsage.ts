import type { AuthRequest } from '../middleware/auth';
import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth';
import { UserModel } from '../models/UserModel';
import { createRateLimiter } from '../middleware/rateLimiter';
import log from '../utils/logger';

const router: Router = Router();

// Rate limiter
const adminRateLimit = createRateLimiter('admin');

// 既存のTokenUsageモデルを使用
const TokenUsageModel = require('../../models/TokenUsage');

// 管理者認証ミドルウェア
const authenticateAdmin = (req: AuthRequest, res: Response, next: any): void => {
  log.debug('Admin authentication check for token-usage API', {
    hasAdmin: !!req.admin,
    adminId: req.admin?._id
  });

  if (!req.admin) {
    log.debug('Admin access denied - admin access required');
    res.status(403).json({ 
      error: '管理者権限が必要です',
      debug: {
        hasAdmin: !!req.admin
      }
    });
    return;
  }
  
  log.debug('Admin access granted for token-usage API');
  next();
};

// トークン使用状況一覧取得
router.get('/', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const userId = req.query.userId as string;
    const characterId = req.query.characterId as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const usageType = req.query.usageType as string;

    log.debug('Admin token-usage query', { page, limit, userId, characterId, dateFrom, dateTo, usageType });

    // クエリ構築
    const query: any = {};

    // Validate and sanitize userId
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = { $eq: new mongoose.Types.ObjectId(userId) };
    }

    // Validate and sanitize characterId
    if (characterId && mongoose.Types.ObjectId.isValid(characterId)) {
      query.characterId = { $eq: new mongoose.Types.ObjectId(characterId) };
    }

    // Validate usageType
    const allowedUsageTypes = ['chat', 'generation', 'moderation', 'other'];
    if (usageType && allowedUsageTypes.includes(usageType)) {
      query.usageType = { $eq: usageType };
    }

    // Validate date range
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          query.createdAt.$gte = fromDate;
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          query.createdAt.$lte = toDate;
        }
      }
    }

    const skip = (page - 1) * limit;

    // トークン使用履歴を取得
    const tokenUsages = await TokenUsageModel.find(query)
      .populate('userId', 'name email')
      .populate('characterId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await TokenUsageModel.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // 統計情報を計算（簡略版）
    const stats = await TokenUsageModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: '$tokensUsed' },
          avgTokensPerUse: { $avg: '$tokensUsed' },
          totalUsages: { $sum: 1 }
        }
      }
    ]);

    const summary = stats[0] || {
      totalTokens: 0,
      avgTokensPerUse: 0,
      totalUsages: 0
    };

    // レスポンス用にデータを整形（既存モデル構造に対応）
    const formattedUsages = tokenUsages.map((usage: any) => ({
      _id: usage._id,
      user: {
        _id: usage.userId?._id,
        name: usage.userId?.name || '名前未設定',
        email: usage.userId?.email
      },
      character: {
        _id: usage.characterId?._id,
        name: usage.characterId?.name?.ja || usage.characterId?.name || '不明なキャラクター'
      },
      tokensUsed: usage.tokensUsed,
      messageContent: usage.messageContent || '',
      tokenType: usage.tokenType || 'chat_message',
      sessionId: usage.sessionId,
      createdAt: usage.createdAt || usage.timestamp
    }));

    log.debug('Fetched token usage records', { count: formattedUsages.length });

    res.json({
      tokenUsages: formattedUsages,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        limit
      },
      summary: {
        totalTokensUsed: summary.totalTokens,
        totalUsages: summary.totalUsages,
        averageTokensPerUse: Math.round(summary.avgTokensPerUse || 0)
      }
    });

  } catch (error) {
    log.error('Error fetching admin token usage', error);
    res.status(500).json({ error: 'トークン使用状況の取得に失敗しました' });
  }
});

// 日別トークン使用統計（一時的に簡略化）
router.get('/daily-stats', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    log.debug('Daily token usage stats query (simplified)');
    
    // 一時的に空のデータを返す
    res.json({
      dailyStats: []
    });

  } catch (error) {
    log.error('Error fetching daily token stats', error);
    res.status(500).json({ error: '日別統計の取得に失敗しました' });
  }
});

// キャラクター別トークン使用統計（一時的に簡略化）
router.get('/character-stats', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    log.debug('Character token usage stats query (simplified)');
    
    // 一時的に空のデータを返す
    res.json({
      characterStats: []
    });

  } catch (error) {
    log.error('Error fetching character token stats', error);
    res.status(500).json({ error: 'キャラクター別統計の取得に失敗しました' });
  }
});

export default router;