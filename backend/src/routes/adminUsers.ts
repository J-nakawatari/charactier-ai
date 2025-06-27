import type { AuthRequest } from '../middleware/auth';
import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth';
import { UserModel } from '../models/UserModel';
import { validate, validateObjectId } from '../middleware/validation';
import { adminSchemas } from '../validation/schemas';
import log from '../utils/logger';
import { sendErrorResponse, ClientErrorCode } from '../utils/errorResponse';
import { createRateLimiter } from '../middleware/rateLimiter';
import { escapeRegex } from '../utils/escapeRegex';

const router: Router = Router();

// Rate limiter
const adminRateLimit = createRateLimiter('admin');

// 管理者認証ミドルウェア
const authenticateAdmin = (req: AuthRequest, res: Response, next: any): void => {
  log.debug('Admin authentication check for users API', {
    hasAdmin: !!req.admin,
    adminId: req.admin?._id?.toString(),
    path: req.path,
    originalUrl: req.originalUrl
  });

  // 管理者パスなので req.admin をチェック
  if (!req.admin) {
    log.warn('Admin access denied - no admin in request', { 
      hasAdmin: !!req.admin,
      path: req.originalUrl 
    });
    sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin access required');
    return;
  }
  
  log.debug('Admin access granted for users API', { adminId: req.admin._id?.toString() });
  next();
};

// 管理者用ユーザー一覧取得
router.get('/', 
  adminRateLimit,
  authenticateToken, 
  authenticateAdmin, 
  validate({ query: adminSchemas.searchUsers }),
  async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;
    const status = req.query.status as string;

    log.debug('Admin users query', { page, limit, search, status });

    // クエリ構築
    const query: any = {
      // 削除済みユーザーを除外
      email: { $not: /^deleted_.*@deleted\.local$/ }
    };

    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$and = [
        {
          $or: [
            { name: new RegExp(escapedSearch, 'i') },
            { email: new RegExp(escapedSearch, 'i') }
          ]
        }
      ];
    }

    if (status) {
      if (status === 'active') {
        query.accountStatus = 'active';
      } else if (status === 'inactive') {
        query.accountStatus = 'inactive';
      } else if (status === 'suspended') {
        query.accountStatus = { $in: ['suspended', 'account_suspended', 'banned'] };
      }
    }

    const skip = (page - 1) * limit;

    // ユーザー一覧を取得
    const users = await UserModel.find(query)
      .select('_id name email isActive accountStatus tokenBalance totalSpent totalChatMessages lastLogin createdAt isSetupComplete')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await UserModel.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // レスポンス用にデータを整形
    const formattedUsers = users.map(user => ({
        id: user._id.toString(),
        _id: user._id.toString(), // フロントエンドが期待する_idフィールドを追加
        name: user.name || '名前未設定',
        email: user.email,
        status: (user.accountStatus === 'suspended' || user.accountStatus === 'account_suspended' || user.accountStatus === 'banned') ? 'suspended' : (user.isActive ? 'active' : 'inactive'),
        isTrialUser: !user.isSetupComplete,
        tokenBalance: user.tokenBalance || 0,
        totalSpent: user.totalSpent || 0,
        chatCount: user.totalChatMessages || 0,
        lastLogin: user.lastLogin ? user.lastLogin.toISOString() : user.createdAt.toISOString(),
        createdAt: user.createdAt.toISOString() // createdAtフィールドも追加
    }));

    console.log(`✅ Fetched ${formattedUsers.length} users for admin`);

    res.json({
      users: formattedUsers,
      pagination: {
        total: total, // フロントエンドが期待するフィールド名に変更
        page: page, // フロントエンドが期待するフィールド名に変更
        limit: limit,
        totalPages: totalPages
      }
    });

  } catch (error) {
    log.error('Error fetching admin users', error, {
      adminId: req.admin?._id,
      query: req.query
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 個別ユーザーのトークン残高リセット
router.post('/:userId/reset-tokens', 
  adminRateLimit,
  authenticateToken, 
  authenticateAdmin,
  validateObjectId('userId'),
  validate({ body: adminSchemas.updateUserBalance }),
  async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { newBalance } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'User not found');
      return;
    }

    const previousBalance = user.tokenBalance || 0;

    await UserModel.findByIdAndUpdate(
      req.params.userId,
      { tokenBalance: newBalance },
      { new: true }
    );

    log.info('Token balance reset', { 
      userId: req.params.userId, 
      previousBalance, 
      newBalance,
      adminId: req.admin?._id 
    });

    res.json({
      success: true,
      message: 'トークン残高を更新しました',
      previousBalance,
      newBalance
    });

  } catch (error) {
    log.error('Error resetting user tokens', error, {
      adminId: req.admin?._id,
      userId: req.params.userId,
      newBalance: req.body.newBalance
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// ユーザーのステータス変更（アクティブ/非アクティブ/停止）
router.put('/:userId/status', 
  adminRateLimit, 
  authenticateToken, 
  authenticateAdmin,
  validateObjectId('userId'),
  validate({ body: adminSchemas.updateUserStatus }),
  async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'User not found');
      return;
    }

    const updateData: any = {};
    if (status === 'active') {
      updateData.isActive = true;
      updateData.accountStatus = 'active';
    } else if (status === 'inactive') {
      updateData.isActive = false;
      updateData.accountStatus = 'inactive';
    } else if (status === 'suspended') {
      updateData.isActive = false;
      updateData.accountStatus = 'suspended';
    }

    await UserModel.findByIdAndUpdate(req.params.userId, updateData);

    log.info('User status updated', { userId: req.params.userId, status, adminId: req.admin?._id });

    res.json({
      success: true,
      message: 'ユーザーステータスを更新しました',
      newStatus: status
    });

  } catch (error) {
    log.error('Error updating user status', error, {
      adminId: req.admin?._id,
      userId: req.params.userId,
      status: req.body.status
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 管理者向けユーザー詳細取得
router.get('/:id', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await UserModel.findById(id)
      .select('-password')
      .populate('selectedCharacter', 'name')
      .populate('purchasedCharacters', 'name')
      .populate('affinities.character', 'name');

    if (!user) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'User not found');
      return;
    }

    // UserTokenPackから正確なトークン残高を計算
    let actualTokenBalance = user.tokenBalance; // fallback
    try {
      const UserTokenPack = require('../../../models/UserTokenPack');
      actualTokenBalance = await UserTokenPack.calculateUserTokenBalance(user._id);
    } catch (error) {
      console.error('TokenPack calculation error:', error);
    }

    res.json({
      id: user._id,
      name: user.name || '',
      email: user.email,
      tokenBalance: actualTokenBalance,
      chatCount: user.totalChatMessages || 0,
      avgIntimacy: user.affinities.length > 0 
        ? user.affinities.reduce((sum, aff) => sum + aff.level, 0) / user.affinities.length 
        : 0,
      totalSpent: user.totalSpent || 0,
      status: user.accountStatus,
      isTrialUser: actualTokenBalance === 10000 && user.totalSpent === 0,
      loginStreak: user.loginStreak || 0,
      maxLoginStreak: user.maxLoginStreak || 0,
      violationCount: user.violationCount || 0,
      registrationDate: user.registrationDate || user.createdAt,
      lastLogin: user.lastLogin,
      suspensionEndDate: user.suspensionEndDate,
      banReason: user.banReason,
      unlockedCharacters: user.purchasedCharacters?.map(char => {
        const character = char as any;
        return {
          id: character._id,
          name: typeof character === 'object' && character.name ? 
            (typeof character.name === 'object' ? (character.name.ja || character.name.en || 'Unknown') : character.name) : 
            'Unknown Character'
        };
      }) || [],
      affinities: user.affinities.map(aff => {
        const character = aff.character as any;
        return {
          characterId: typeof character === 'object' ? character._id : character,
          characterName: typeof character === 'object' && character.name ? 
            (typeof character.name === 'object' ? (character.name.ja || character.name.en || 'Unknown') : character.name) : 
            'Unknown Character',
          level: aff.level,
          totalConversations: aff.totalConversations,
          relationshipType: aff.relationshipType,
          trustLevel: aff.trustLevel
        };
      })
    });

  } catch (error) {
    log.error('Error fetching user details', error, {
      adminId: req.admin?._id,
      userId: req.params.id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

export default router;