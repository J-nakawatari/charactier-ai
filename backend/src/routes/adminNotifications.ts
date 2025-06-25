import type { AuthRequest } from '../middleware/auth';
import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth';
import { NotificationModel } from '../models/NotificationModel';
import { AdminNotificationReadStatusModel } from '../models/AdminNotificationReadStatusModel';
import { sendErrorResponse, ClientErrorCode } from '../utils/errorResponse';
import log from '../utils/logger';

const router: Router = Router();

// 管理者用お知らせ一覧取得（システム通知など）
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin access required');
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const types = req.query.type ? (req.query.type as string).split(',') : null;

    log.info('Admin notifications request', {
      adminId: req.admin._id,
      limit,
      offset,
      types
    });

    // クエリ構築
    const query: any = {
      isActive: true,
      // 管理者向け通知のみ（または全体向け）
      $or: [
        { targetUserGroups: 'admins' },
        { targetUserGroups: 'all' }
      ]
    };

    // タイプフィルター
    if (types && types.length > 0) {
      query.type = { $in: types };
    }

    // 現在有効な通知のみ
    const now = new Date();
    query.validFrom = { $lte: now };
    query.$and = [
      {
        $or: [
          { validUntil: { $exists: false } },
          { validUntil: { $gte: now } }
        ]
      }
    ];

    // お知らせを取得
    const notifications = await NotificationModel.find(query)
      .sort({ isPinned: -1, priority: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // 管理者の既読状況を取得
    const notificationIds = notifications.map(n => n._id.toString());
    const readStatuses = await AdminNotificationReadStatusModel.find({
      adminId: new mongoose.Types.ObjectId(req.admin._id.toString()),
      notificationId: { $in: notificationIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).lean();

    const readStatusMap = new Map(
      readStatuses.map(rs => [rs.notificationId.toString(), rs])
    );

    // 既読情報を追加
    const notificationsWithReadStatus = notifications.map(notification => ({
      ...notification,
      isRead: readStatusMap.has(notification._id.toString()) ? 
        readStatusMap.get(notification._id.toString())!.isRead : false,
      readAt: readStatusMap.has(notification._id.toString()) ? 
        readStatusMap.get(notification._id.toString())!.readAt : null
    }));

    // 総数を取得
    const total = await NotificationModel.countDocuments(query);

    res.json({
      notifications: notificationsWithReadStatus,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    log.error('Error fetching admin notifications', error, {
      adminId: req.admin?._id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 管理者用お知らせ既読マーク
router.post('/:id/read', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin access required');
      return;
    }

    const notificationId = req.params.id;

    // お知らせの存在確認
    const notification = await NotificationModel.findById(notificationId);
    if (!notification) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Notification not found');
      return;
    }

    // 既読状態を更新（upsert）
    await AdminNotificationReadStatusModel.findOneAndUpdate(
      {
        adminId: new mongoose.Types.ObjectId(req.admin._id.toString()),
        notificationId: new mongoose.Types.ObjectId(notificationId)
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: '既読にしました'
    });

  } catch (error) {
    log.error('Error marking admin notification as read', error, {
      adminId: req.admin?._id,
      notificationId: req.params.id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 管理者用統計情報取得
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin access required');
      return;
    }

    const [
      totalActive,
      totalByType,
      unreadCount,
      recentNotifications
    ] = await Promise.all([
      // アクティブな通知総数
      NotificationModel.countDocuments({ isActive: true }),
      
      // タイプ別集計
      NotificationModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      
      // 未読数
      NotificationModel.countDocuments({
        isActive: true,
        _id: {
          $nin: await AdminNotificationReadStatusModel.find({
            adminId: req.admin._id.toString(),
            isRead: true
          }).distinct('notificationId')
        }
      }),
      
      // 最近の通知
      NotificationModel.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title type createdAt')
    ]);

    const typeStats = totalByType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      stats: {
        totalActive,
        unreadCount,
        byType: {
          info: typeStats.info || 0,
          warning: typeStats.warning || 0,
          urgent: typeStats.urgent || 0,
          promotion: typeStats.promotion || 0,
          maintenance: typeStats.maintenance || 0,
          update: typeStats.update || 0
        },
        recentNotifications
      }
    });

  } catch (error) {
    log.error('Error fetching admin notification stats', error, {
      adminId: req.admin?._id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

export default router;