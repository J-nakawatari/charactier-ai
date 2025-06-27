import type { AuthRequest } from '../middleware/auth';
import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth';
import { TokenPackModel } from '../models/TokenPackModel';
import { createRateLimiter } from '../middleware/rateLimiter';
import log from '../utils/logger';

const router: Router = Router();

// Rate limiter
const adminRateLimit = createRateLimiter('admin');

// 管理者認証ミドルウェア
const authenticateAdmin = (req: AuthRequest, res: Response, next: any): void => {
  log.debug('Admin authentication check for token-packs API', {
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
  
  log.debug('Admin access granted for token-packs API');
  next();
};

// トークンパック一覧取得
router.get('/', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const isActive = req.query.isActive;

    log.debug('Admin token-packs query', { page, limit, isActive });

    const query: any = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const tokenPacks = await TokenPackModel.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // 現在の為替レートを取得して実際の利益率を計算
    const { calcTokensToGive } = require('../config/tokenConfig');
    const currentModel = 'gpt-4o-mini'; // デフォルトモデルを指定
    
    // 各パックの実際の利益率を計算（99%利益率システム）
    const tokenPacksWithProfitMargin = await Promise.all(tokenPacks.map(async (pack) => {
      const expectedTokens = await calcTokensToGive(pack.price, currentModel);
      
      return {
        ...pack,
        profitMargin: 99, // 99%利益率システム
        tokenPerYen: pack.tokens / pack.price,
        expectedTokens: expectedTokens // 参考値として期待トークン数も含める
      };
    }));

    const total = await TokenPackModel.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    log.debug('Fetched token packs for admin', { count: tokenPacks.length });

    res.json({
      tokenPacks: tokenPacksWithProfitMargin,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });

  } catch (error) {
    log.error('Error fetching admin token packs', error);
    res.status(500).json({ error: 'トークンパック一覧の取得に失敗しました' });
  }
});

// トークンパック作成
router.post('/', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      tokens,
      price,
      priceId,
      isActive = true,
      profitMargin = 99,
      bonusTokens = 0,
      popularTag = false,
      limitedTime = false,
      validUntil,
      displayOrder = 0
    } = req.body;

    // バリデーション
    if (!name || !description || !tokens || !price) {
      res.status(400).json({ error: '必須フィールドが不足しています' });
      return;
    }

    if (tokens <= 0 || price <= 0) {
      res.status(400).json({ error: 'トークン数と価格は正の数である必要があります' });
      return;
    }

    const tokenPerYen = tokens / price;

    const tokenPack = new TokenPackModel({
      name,
      description,
      tokens,
      price,
      priceId,
      isActive,
      profitMargin,
      tokenPerYen,
      bonusTokens,
      popularTag,
      limitedTime,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      displayOrder
    });

    const savedTokenPack = await tokenPack.save();

    log.info('Token pack created', { id: savedTokenPack._id });

    res.status(201).json({
      message: 'トークンパックが作成されました',
      tokenPack: savedTokenPack
    });

  } catch (error) {
    log.error('Error creating token pack', error);
    res.status(500).json({ error: 'トークンパックの作成に失敗しました' });
  }
});

// トークンパック更新
router.put('/:id', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // tokenPerYenを再計算
    if (updateData.tokens && updateData.price) {
      updateData.tokenPerYen = updateData.tokens / updateData.price;
      
      // 99%利益率システム
      updateData.profitMargin = 99;
    }

    if (updateData.validUntil) {
      updateData.validUntil = new Date(updateData.validUntil);
    }

    const tokenPack = await TokenPackModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!tokenPack) {
      res.status(404).json({ error: 'トークンパックが見つかりません' });
      return;
    }

    log.info('Token pack updated', { id: tokenPack._id });

    res.json({
      message: 'トークンパックが更新されました',
      tokenPack
    });

  } catch (error) {
    log.error('Error updating token pack', error);
    res.status(500).json({ error: 'トークンパックの更新に失敗しました' });
  }
});

// トークンパック削除
router.delete('/:id', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tokenPack = await TokenPackModel.findByIdAndDelete(id);

    if (!tokenPack) {
      res.status(404).json({ error: 'トークンパックが見つかりません' });
      return;
    }

    log.info('Token pack deleted', { id });

    res.json({
      message: 'トークンパックが削除されました'
    });

  } catch (error) {
    log.error('Error deleting token pack', error);
    res.status(500).json({ error: 'トークンパックの削除に失敗しました' });
  }
});

// 個別トークンパック取得
router.get('/:id', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tokenPack = await TokenPackModel.findById(id);

    if (!tokenPack) {
      res.status(404).json({ error: 'トークンパックが見つかりません' });
      return;
    }

    res.json(tokenPack);

  } catch (error) {
    log.error('Error fetching token pack', error);
    res.status(500).json({ error: 'トークンパックの取得に失敗しました' });
  }
});

export default router;