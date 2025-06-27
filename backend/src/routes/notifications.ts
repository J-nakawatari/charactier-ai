import type { AuthRequest } from '../middleware/auth';
import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth';
import { validateObjectId } from '../middleware/validation';
import { NotificationModel, INotification } from '../models/NotificationModel';
import { UserNotificationReadStatusModel } from '../models/UserNotificationReadStatusModel';
import { UserModel } from '../models/UserModel';
import { AdminNotificationReadStatusModel } from '../models/AdminNotificationReadStatusModel';
import { getRedisPublisher } from '../../lib/redis';
import { createRateLimiter } from '../middleware/rateLimiter';
import { escapeRegex } from '../utils/escapeRegex';
import log from '../utils/logger';

const router: Router = Router();

// Rate limiters
const generalRateLimit = createRateLimiter('general');
const adminRateLimit = createRateLimiter('admin');

// ユーザー向けお知らせ一覧取得
router.get('/', generalRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string;

    // 現在時刻でフィルタリング（有効なお知らせのみ）
    const now = new Date();
    const baseQuery: any = {
      isActive: true,
      validFrom: { $lte: now },
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: { $gte: now } }
      ]
    };

    if (type) {
      baseQuery.type = type;
    }

    // お知らせを取得
    const notifications = await NotificationModel.find(baseQuery)
      .sort({ isPinned: -1, priority: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // ユーザーの既読状況を取得
    const notificationIds = notifications.map(n => n._id.toString());
    const readStatuses = await UserNotificationReadStatusModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      notificationId: { $in: notificationIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).lean();

    const readStatusMap = new Map(
      readStatuses.map(status => [status.notificationId.toString(), status])
    );

    // お知らせに既読状況を追加
    const userNotifications = notifications
      .filter(notification => {
        // 対象ユーザーチェック
        return NotificationModel.prototype.isTargetUser.call(notification, req.user!);
      })
      .map(notification => {
        const readStatus = readStatusMap.get(notification._id.toString());
        return {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          isPinned: notification.isPinned,
          priority: notification.priority,
          isRead: readStatus?.isRead || false,
          isViewed: readStatus?.isViewed || false,
          readAt: readStatus?.readAt,
          viewedAt: readStatus?.viewedAt,
          createdAt: notification.createdAt,
          validFrom: notification.validFrom,
          validUntil: notification.validUntil
        };
      });

    // 未読件数を計算
    const unreadCount = userNotifications.filter(n => !n.isRead).length;
    const total = await NotificationModel.countDocuments(baseQuery);

    res.json({
      notifications: userNotifications,
      unreadCount,
      total
    });

  } catch (error) {
    log.error('Error fetching user notifications', error);
    res.status(500).json({ error: 'お知らせの取得に失敗しました' });
  }
});

// 未読お知らせ件数取得
router.get('/unread-count', generalRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;

    // 有効なお知らせを取得
    const now = new Date();
    const activeNotifications = await NotificationModel.find({
      isActive: true,
      validFrom: { $lte: now },
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: { $gte: now } }
      ]
    }).lean();

    // ユーザーが対象のお知らせをフィルタリング
    const targetNotifications = activeNotifications.filter(notification =>
      NotificationModel.prototype.isTargetUser.call(notification, req.user!)
    );

    // 既読状況を取得
    const notificationIds = targetNotifications.map(n => n._id.toString());
    const readStatuses = await UserNotificationReadStatusModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      notificationId: { $in: notificationIds.map(id => new mongoose.Types.ObjectId(id)) },
      isRead: false
    }).lean();

    const unreadCount = notificationIds.length - readStatuses.length;

    res.json({ unreadCount });

  } catch (error) {
    log.error('Error fetching unread count', error);
    res.status(500).json({ error: '未読件数の取得に失敗しました' });
  }
});

// お知らせ既読マーク
router.post('/:id/read', generalRateLimit, authenticateToken, validateObjectId('id'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const notificationId = req.params.id;

    // お知らせの存在確認
    const notification = await NotificationModel.findById(notificationId);
    if (!notification) {
      res.status(404).json({ error: 'お知らせが見つかりません' });
      return;
    }

    // 既読状態を更新
    await UserNotificationReadStatusModel.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        notificationId: new mongoose.Types.ObjectId(notificationId)
      },
      {
        $setOnInsert: {
          userId: new mongoose.Types.ObjectId(userId),
          notificationId: new mongoose.Types.ObjectId(notificationId)
        },
        isRead: true,
        isViewed: true,
        readAt: new Date(),
        viewedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // お知らせの既読統計を更新
    await notification.incrementRead();

    res.json({
      success: true,
      message: '既読マークが完了しました'
    });

    // リアルタイム通知のため、Redisにイベントを発行
    try {
      const publisher = await getRedisPublisher();
      const unreadCount = await UserNotificationReadStatusModel.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        isRead: false
      });
      
      publisher.publish(
        `notifications:user:${userId}`,
        JSON.stringify({
          type: 'markAsRead',
          notificationId,
          unreadCount
        })
      );
    } catch (error) {
      log.error('Error publishing notification event', error);
    }

  } catch (error) {
    log.error('Error marking notification as read', error);
    res.status(500).json({ error: '既読マークに失敗しました' });
  }
});

// 全お知らせ既読マーク
router.post('/read-all', generalRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;

    // 有効なお知らせを取得
    const now = new Date();
    const activeNotifications = await NotificationModel.find({
      isActive: true,
      validFrom: { $lte: now },
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: { $gte: now } }
      ]
    }).lean();

    // ユーザーが対象のお知らせをフィルタリング
    const targetNotifications = activeNotifications.filter(notification =>
      NotificationModel.prototype.isTargetUser.call(notification, req.user!)
    );

    const notificationIds = targetNotifications.map(n => n._id.toString());

    // 一括既読更新
    const operations = notificationIds.map(notificationId => ({
      updateOne: {
        filter: {
          userId: new mongoose.Types.ObjectId(userId),
          notificationId: new mongoose.Types.ObjectId(notificationId)
        },
        update: {
          $setOnInsert: {
            userId: new mongoose.Types.ObjectId(userId),
            notificationId: new mongoose.Types.ObjectId(notificationId)
          },
          isRead: true,
          isViewed: true,
          readAt: new Date(),
          viewedAt: new Date()
        },
        upsert: true
      }
    }));

    const result = await UserNotificationReadStatusModel.bulkWrite(operations);

    res.json({
      success: true,
      markedCount: result.upsertedCount + result.modifiedCount
    });

  } catch (error) {
    log.error('Error marking all notifications as read', error);
    res.status(500).json({ error: '一括既読マークに失敗しました' });
  }
});

// ========== 管理者用エンドポイント ==========

// デバッグ用: 現在のユーザー情報確認
router.get('/debug/user', generalRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    log.debug('Debug user info', {
      hasUser: !!req.user,
      userId: req.user?._id,
      email: req.user?.email,
      isAdmin: req.user?.isAdmin,
      role: req.user?.role
    });

    res.json({
      user: {
        _id: req.user?._id,
        email: req.user?.email,
        isAdmin: req.user?.isAdmin,
        role: req.user?.role
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    log.error('Debug endpoint error', error);
    res.status(500).json({ error: 'デバッグ情報の取得に失敗しました' });
  }
});

// 管理者認証ミドルウェア
const authenticateAdmin = (req: AuthRequest, res: Response, next: any): void => {
  // デバッグログを追加
  log.debug('Admin authentication check', {
    hasUser: !!req.user,
    userId: req.user?._id,
    isAdmin: req.user?.isAdmin,
    email: req.user?.email,
    role: req.user?.role,
    headers: {
      authorization: req.headers.authorization ? 'Bearer ***' : 'なし'
    }
  });

  // authenticateTokenが既に実行されているので、isAdminフラグをチェックするだけ
  if (!req.user?.isAdmin) {
    log.debug('Admin access denied - user is not admin');
    res.status(403).json({ 
      error: '管理者権限が必要です',
      debug: {
        hasUser: !!req.user,
        isAdmin: req.user?.isAdmin
      }
    });
    return;
  }
  
  log.debug('Admin access granted');
  next();
};

// 管理者用未読通知数取得
router.get('/admin/unread-count', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.user?._id;
    if (!adminId) {
      res.status(401).json({ error: '管理者IDが取得できません' });
      return;
    }

    // 全ての有効な通知を取得
    const activeNotifications = await NotificationModel.find({ isActive: true });
    
    // 管理者の既読状態を取得
    const readStatuses = await AdminNotificationReadStatusModel.find({
      adminId,
      isRead: true
    });
    
    const readNotificationIds = new Set(readStatuses.map(status => status.notificationId.toString()));
    
    // 未読通知数をカウント
    const unreadCount = activeNotifications.filter(notification => 
      !readNotificationIds.has(notification._id.toString())
    ).length;

    res.json({ unreadCount });
  } catch (error) {
    log.error('未読通知数取得エラー', error);
    res.status(500).json({ error: '未読通知数の取得に失敗しました' });
  }
});

// 管理者用お知らせ一覧取得
router.get('/admin', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const type = req.query.type as string;
    const isActive = req.query.isActive;
    const search = req.query.search as string;

    const query: any = {};

    // カンマ区切りで複数のタイプを指定可能にする
    if (type) {
      const types = type.split(',').map(t => t.trim());
      if (types.length === 1) {
        query.type = types[0];
      } else {
        query.type = { $in: types };
      }
    }
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { 'title.ja': new RegExp(escapedSearch, 'i') },
        { 'title.en': new RegExp(escapedSearch, 'i') },
        { 'message.ja': new RegExp(escapedSearch, 'i') },
        { 'message.en': new RegExp(escapedSearch, 'i') }
      ];
    }

    const skip = (page - 1) * limit;
    const notifications = await NotificationModel.find(query)
      .sort({ isPinned: -1, priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .lean();

    // 管理者の既読状態を取得
    const adminId = req.user?._id;
    const readStatuses = adminId ? await AdminNotificationReadStatusModel.find({
      adminId,
      notificationId: { $in: notifications.map(n => n._id) }
    }) : [];
    
    const readStatusMap = new Map(
      readStatuses.map(status => [status.notificationId.toString(), status])
    );

    // createdByが存在しない場合のフォールバック処理と既読状態の追加
    const safeNotifications = notifications.map(notification => {
      const readStatus = readStatusMap.get(notification._id.toString());
      return {
        ...notification,
        createdBy: notification.createdBy || { name: 'システム', email: 'system@charactier.ai' },
        isRead: readStatus?.isRead || false,
        readAt: readStatus?.readAt || null
      };
    });

    const total = await NotificationModel.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      notifications: safeNotifications,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total
      }
    });

  } catch (error) {
    log.error('Error fetching admin notifications', error);
    res.status(500).json({ error: 'お知らせ一覧の取得に失敗しました' });
  }
});

// お知らせ作成
router.post('/admin', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      message,
      type = 'info',
      isPinned = false,
      priority = 0,
      targetCondition = { type: 'all' },
      validFrom,
      validUntil
    } = req.body;

    // バリデーション
    if (!title || !title.ja || !title.en) {
      res.status(400).json({ error: 'タイトルは日本語・英語両方必須です' });
      return;
    }
    if (!message || !message.ja || !message.en) {
      res.status(400).json({ error: 'メッセージは日本語・英語両方必須です' });
      return;
    }

    // 対象ユーザー数を計算
    let totalTargetUsers = 0;
    if (targetCondition.type === 'all') {
      totalTargetUsers = await UserModel.countDocuments({ isActive: true });
    } else if (targetCondition.type === 'specific_users' && targetCondition.userIds) {
      totalTargetUsers = targetCondition.userIds.length;
    }
    // 他の条件の場合は複雑な計算が必要なため、後で更新

    const notification = new NotificationModel({
      title,
      message,
      type,
      isPinned,
      priority,
      targetCondition,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : undefined,
      totalTargetUsers,
      createdBy: req.user!._id
    });

    const savedNotification = await notification.save();

    res.status(201).json({ notification: savedNotification });

    // 対象ユーザーにリアルタイム通知を送信
    try {
      const publisher = await getRedisPublisher();
      
      // 全ユーザーまたは特定ユーザーへの通知
      if (targetCondition.type === 'all') {
        // 全ユーザーへの通知の場合、個別に通知する必要があるため
        // ここでは新規通知の存在だけを通知
        publisher.publish(
          'notifications:broadcast',
          JSON.stringify({
            type: 'newNotification',
            notification: {
              id: savedNotification._id,
              title: savedNotification.title,
              type: savedNotification.type
            }
          })
        );
      } else if (targetCondition.type === 'specific_users' && targetCondition.userIds) {
        // 特定ユーザーへの通知
        for (const userId of targetCondition.userIds) {
          publisher.publish(
            `notifications:user:${userId}`,
            JSON.stringify({
              type: 'newNotification',
              notification: {
                id: savedNotification._id,
                title: savedNotification.title,
                type: savedNotification.type
              }
            })
          );
        }
      }
    } catch (error) {
      log.error('Error publishing new notification event', error);
    }

  } catch (error) {
    log.error('Error creating notification', error);
    res.status(500).json({ error: 'お知らせの作成に失敗しました' });
  }
});

// 個別お知らせ取得
router.get('/admin/:id', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await NotificationModel.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!notification) {
      res.status(404).json({ error: 'お知らせが見つかりません' });
      return;
    }

    res.json(notification);

  } catch (error) {
    log.error('Error fetching notification', error);
    res.status(500).json({ error: 'お知らせの取得に失敗しました' });
  }
});

// お知らせ更新
router.put('/admin/:id', adminRateLimit, authenticateToken, authenticateAdmin, validateObjectId('id'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      message,
      type,
      isActive,
      isPinned,
      priority,
      targetCondition,
      validFrom,
      validUntil
    } = req.body;

    const updateData: any = {
      updatedBy: req.user!._id
    };

    if (title) updateData.title = title;
    if (message) updateData.message = message;
    if (type) updateData.type = type;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (priority !== undefined) updateData.priority = priority;
    if (targetCondition) updateData.targetCondition = targetCondition;
    if (validFrom) updateData.validFrom = new Date(validFrom);
    if (validUntil) updateData.validUntil = new Date(validUntil);

    const notification = await NotificationModel.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!notification) {
      res.status(404).json({ error: 'お知らせが見つかりません' });
      return;
    }

    res.json(notification);

  } catch (error) {
    log.error('Error updating notification', error);
    res.status(500).json({ error: 'お知らせの更新に失敗しました' });
  }
});

// お知らせ削除
router.delete('/admin/:id', adminRateLimit, authenticateToken, authenticateAdmin, validateObjectId('id'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await NotificationModel.findByIdAndDelete(req.params.id);

    if (!notification) {
      res.status(404).json({ error: 'お知らせが見つかりません' });
      return;
    }

    // 関連する既読状況も削除
    await UserNotificationReadStatusModel.deleteMany({
      notificationId: new mongoose.Types.ObjectId(req.params.id)
    });

    res.json({ success: true });

  } catch (error) {
    log.error('Error deleting notification', error);
    res.status(500).json({ error: 'お知らせの削除に失敗しました' });
  }
});

// お知らせ統計取得
router.get('/admin/:id/stats', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notificationId = req.params.id;

    const notification = await NotificationModel.findById(notificationId);
    if (!notification) {
      res.status(404).json({ error: 'お知らせが見つかりません' });
      return;
    }

    // 既読統計を取得
    const readStats = await UserNotificationReadStatusModel.aggregate([
      { $match: { notificationId: new mongoose.Types.ObjectId(notificationId) } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: { $cond: ['$isViewed', 1, 0] } },
          totalReads: { $sum: { $cond: ['$isRead', 1, 0] } }
        }
      }
    ]);

    const stats = readStats[0] || { totalViews: 0, totalReads: 0 };

    // 日別統計（過去30日）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats = await UserNotificationReadStatusModel.aggregate([
      {
        $match: {
          notificationId: new mongoose.Types.ObjectId(notificationId),
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          views: { $sum: { $cond: ['$isViewed', 1, 0] } },
          reads: { $sum: { $cond: ['$isRead', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const readRate = notification.totalTargetUsers > 0 
      ? (stats.totalReads / notification.totalTargetUsers) * 100 
      : 0;
    const viewRate = notification.totalTargetUsers > 0 
      ? (stats.totalViews / notification.totalTargetUsers) * 100 
      : 0;

    res.json({
      notificationId,
      totalTargetUsers: notification.totalTargetUsers,
      totalViews: stats.totalViews,
      totalReads: stats.totalReads,
      readRate,
      viewRate,
      dailyStats: dailyStats.map(stat => ({
        date: stat._id,
        views: stat.views,
        reads: stat.reads
      })),
      userSegmentStats: [] // 将来実装
    });

  } catch (error) {
    log.error('Error fetching notification stats', error);
    res.status(500).json({ error: '統計の取得に失敗しました' });
  }
});

// 管理者用通知既読マーク
router.post('/admin/:id/read', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notificationId = req.params.id;
    const adminId = req.user?._id;

    if (!adminId) {
      res.status(401).json({ error: '管理者IDが取得できません' });
      return;
    }

    // 通知の存在確認
    const notification = await NotificationModel.findById(notificationId);
    if (!notification) {
      res.status(404).json({ error: '通知が見つかりません' });
      return;
    }

    // 既読状態を更新または作成
    await AdminNotificationReadStatusModel.findOneAndUpdate(
      { adminId, notificationId },
      { 
        isRead: true,
        readAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (error) {
    log.error('管理者通知既読マークエラー', error);
    res.status(500).json({ error: '既読状態の更新に失敗しました' });
  }
});

// 管理者用通知一括既読マーク
router.post('/admin/read-all', adminRateLimit, authenticateToken, authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.user?._id;

    if (!adminId) {
      res.status(401).json({ error: '管理者IDが取得できません' });
      return;
    }

    // 全ての有効な通知を取得
    const activeNotifications = await NotificationModel.find({ isActive: true });
    
    // 既読状態を一括作成/更新
    const bulkOperations = activeNotifications.map(notification => ({
      updateOne: {
        filter: { adminId, notificationId: notification._id },
        update: { 
          isRead: true,
          readAt: new Date()
        },
        upsert: true
      }
    }));

    if (bulkOperations.length > 0) {
      await AdminNotificationReadStatusModel.bulkWrite(bulkOperations);
    }

    res.json({ success: true, markedCount: bulkOperations.length });
  } catch (error) {
    log.error('管理者通知一括既読マークエラー', error);
    res.status(500).json({ error: '一括既読の更新に失敗しました' });
  }
});

export default router;