import type { AuthRequest } from '../middleware/auth';
import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth';
import { UserModel } from '../models/UserModel';

const router: Router = Router();

// 既存のTokenUsageモデルを使用
const TokenUsageModel = require('../../models/TokenUsage');

// 管理者認証ミドルウェア
const authenticateAdmin = (req: AuthRequest, res: Response, next: any): void => {
  console.log('🔍 Admin authentication check for token-usage API:', {
    hasUser: !!req.user,
    userId: req.user?._id,
    isAdmin: req.user?.isAdmin,
    email: req.user?.email
  });

  if (!req.user?.isAdmin) {
    console.log('❌ Admin access denied - user is not admin');
    res.status(403).json({ 
      error: '管理者権限が必要です',
      debug: {
        hasUser: !!req.user,
        isAdmin: req.user?.isAdmin
      }
    });
    return;
  }
  
  console.log('✅ Admin access granted for token-usage API');
  next();
};

// トークン使用状況一覧取得
router.get('/', authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const userId = req.query.userId as string;
    const characterId = req.query.characterId as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const usageType = req.query.usageType as string;

    console.log('🔍 Admin token-usage query:', { page, limit, userId, characterId, dateFrom, dateTo, usageType });

    // クエリ構築
    const query: any = {};

    if (userId) {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    if (characterId) {
      query.characterId = new mongoose.Types.ObjectId(characterId);
    }

    if (usageType) {
      query.usageType = usageType;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
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

    console.log(`✅ Fetched ${formattedUsages.length} token usage records for admin`);

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
    console.error('❌ Error fetching admin token usage:', error);
    res.status(500).json({ error: 'トークン使用状況の取得に失敗しました' });
  }
});

// 日別トークン使用統計（一時的に簡略化）
router.get('/daily-stats', authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('🔍 Daily token usage stats query (simplified)');
    
    // 一時的に空のデータを返す
    res.json({
      dailyStats: []
    });

  } catch (error) {
    console.error('❌ Error fetching daily token stats:', error);
    res.status(500).json({ error: '日別統計の取得に失敗しました' });
  }
});

// キャラクター別トークン使用統計（一時的に簡略化）
router.get('/character-stats', authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('🔍 Character token usage stats query (simplified)');
    
    // 一時的に空のデータを返す
    res.json({
      characterStats: []
    });

  } catch (error) {
    console.error('❌ Error fetching character token stats:', error);
    res.status(500).json({ error: 'キャラクター別統計の取得に失敗しました' });
  }
});

export default router;