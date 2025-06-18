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
    const query: any = {};

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
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
      name: user.name || '名前未設定',
      email: user.email,
      status: user.accountStatus === 'suspended' ? 'suspended' : (user.isActive ? 'active' : 'inactive'),
      isTrialUser: !user.isSetupComplete,
      tokenBalance: user.tokenBalance || 0,
      totalSpent: user.totalSpent || 0,
      chatCount: user.totalChatMessages || 0,
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : user.createdAt.toISOString()
    }));

    console.log(`✅ Fetched ${formattedUsers.length} users for admin`);

    res.json({
      users: formattedUsers,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        limit
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

export default router;