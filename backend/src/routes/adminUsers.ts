import type { AuthRequest } from '../middleware/auth';
import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth';
import { UserModel } from '../models/UserModel';

const router: Router = Router();

// 管理者認証ミドルウェア
const authenticateAdmin = (req: AuthRequest, res: Response, next: any): void => {
  console.log('🔍 Admin authentication check for users API:', {
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
  
  console.log('✅ Admin access granted for users API');
  next();
};

// 管理者用ユーザー一覧取得
router.get('/', authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;
    const status = req.query.status as string;

    console.log('🔍 Admin users query:', { page, limit, search, status });

    // クエリ構築
    const query: any = {
      // 削除済みユーザーを除外
      email: { $not: /^deleted_.*@deleted\.local$/ }
    };

    if (search) {
      query.$and = [
        {
          $or: [
            { name: new RegExp(search, 'i') },
            { email: new RegExp(search, 'i') }
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
        query.accountStatus = 'suspended';
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
      status: user.accountStatus === 'suspended' ? 'suspended' : (user.isActive ? 'active' : 'inactive'),
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
    console.error('❌ Error fetching admin users:', error);
    res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました' });
  }
});

// 個別ユーザーのトークン残高リセット
router.post('/:userId/reset-tokens', authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { newBalance } = req.body;

    if (typeof newBalance !== 'number' || newBalance < 0) {
      res.status(400).json({ error: '有効なトークン残高を指定してください' });
      return;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'ユーザーが見つかりません' });
      return;
    }

    const previousBalance = user.tokenBalance || 0;

    await UserModel.findByIdAndUpdate(
      userId,
      { tokenBalance: newBalance },
      { new: true }
    );

    console.log(`✅ Token balance reset for user ${userId}: ${previousBalance} -> ${newBalance}`);

    res.json({
      success: true,
      message: 'トークン残高を更新しました',
      previousBalance,
      newBalance
    });

  } catch (error) {
    console.error('❌ Error resetting user tokens:', error);
    res.status(500).json({ error: 'トークン残高のリセットに失敗しました' });
  }
});

// ユーザーのステータス変更（アクティブ/非アクティブ/停止）
router.put('/:userId/status', authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      res.status(400).json({ error: '有効なステータスを指定してください' });
      return;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'ユーザーが見つかりません' });
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

    await UserModel.findByIdAndUpdate(userId, updateData);

    console.log(`✅ User status updated: ${userId} -> ${status}`);

    res.json({
      success: true,
      message: 'ユーザーステータスを更新しました',
      newStatus: status
    });

  } catch (error) {
    console.error('❌ Error updating user status:', error);
    res.status(500).json({ error: 'ユーザーステータスの更新に失敗しました' });
  }
});

// 管理者向けユーザー詳細取得
router.get('/:id', authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await UserModel.findById(id)
      .select('-password')
      .populate('selectedCharacter', 'name')
      .populate('purchasedCharacters', 'name')
      .populate('affinities.character', 'name');

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'ユーザーが見つかりません'
      });
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
    console.error('❌ Error fetching user details:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'ユーザー詳細の取得に失敗しました'
    });
  }
});

export default router;