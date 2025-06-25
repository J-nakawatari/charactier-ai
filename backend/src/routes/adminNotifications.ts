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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const offset = (page - 1) * limit;
    const types = req.query.type ? (req.query.type as string).split(',') : null;

    log.info('Admin notifications request', {
      adminId: req.admin._id.toString(),
      limit,
      page,
      offset,
      types,
      isActive: req.query.isActive,
      search: req.query.search
    });

    // クエリ構築 - 管理者は全てのお知らせを見る（管理用）
    const query: any = {};

    // タイプフィルター
    if (types && types.length > 0) {
      query.type = { $in: types };
    }

    // isActiveフィルター（フロントエンドから渡される）
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    // 検索フィルター
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      query.$or = [
        { 'title.ja': searchRegex },
        { 'title.en': searchRegex },
        { 'message.ja': searchRegex },
        { 'message.en': searchRegex }
      ];
    }

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
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });

  } catch (error) {
    log.error('Error fetching admin notifications', error, {
      adminId: req.admin?._id?.toString()
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// お知らせ作成
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin access required');
      return;
    }

    const {
      title,
      message,
      type,
      isPinned,
      priority,
      targetCondition,
      validFrom,
      validUntil
    } = req.body;

    // デバッグログ
    log.info('Creating notification - request body', {
      adminId: req.admin._id.toString(),
      hasTitle: !!title,
      hasMessage: !!message,
      type,
      targetCondition
    });

    // 必須フィールドの検証
    if (!title?.ja || !title?.en || !message?.ja || !message?.en) {
      sendErrorResponse(res, 400, ClientErrorCode.INVALID_INPUT, 'Title and message are required in both languages');
      return;
    }

    // お知らせを作成
    const notificationData: any = {
      title,
      message,
      type: type || 'info',
      isPinned: isPinned || false,
      priority: priority || 0,
      targetCondition: targetCondition || { type: 'all' },
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : undefined,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(req.admin._id.toString()),
      totalTargetUsers: 0, // 後で計算する
      totalViews: 0,
      totalReads: 0
    };

    // validUntilがundefinedの場合は除外
    if (!validUntil) {
      delete notificationData.validUntil;
    }

    const notification = await NotificationModel.create(notificationData);

    log.info('Notification created', {
      adminId: req.admin._id.toString(),
      notificationId: notification._id.toString(),
      type: notification.type,
      targetCondition: notification.targetCondition
    });

    res.status(201).json({
      success: true,
      notification,
      message: 'お知らせを作成しました'
    });

  } catch (error: any) {
    log.error('Error creating notification', error, {
      adminId: req.admin?._id?.toString(),
      errorMessage: error.message,
      errorName: error.name
    });
    
    // MongoDBのバリデーションエラーの場合
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors || {}).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      log.error('Validation errors', { validationErrors });
    }
    
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
      adminId: req.admin?._id?.toString(),
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
            adminId: new mongoose.Types.ObjectId(req.admin._id.toString()),
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
      adminId: req.admin?._id?.toString()
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// お知らせ更新
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin access required');
      return;
    }

    const notificationId = req.params.id;
    const {
      title,
      message,
      type,
      isPinned,
      priority,
      targetCondition,
      validFrom,
      validUntil,
      isActive
    } = req.body;

    // お知らせの存在確認
    const notification = await NotificationModel.findById(notificationId);
    if (!notification) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Notification not found');
      return;
    }

    // 更新データを準備
    const updateData: any = {
      updatedBy: new mongoose.Types.ObjectId(req.admin._id.toString()),
      updatedAt: new Date()
    };

    if (title) updateData.title = title;
    if (message) updateData.message = message;
    if (type) updateData.type = type;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (priority !== undefined) updateData.priority = priority;
    if (targetCondition) updateData.targetCondition = targetCondition;
    if (validFrom) updateData.validFrom = new Date(validFrom);
    if (validUntil) updateData.validUntil = new Date(validUntil);
    if (isActive !== undefined) updateData.isActive = isActive;

    // お知らせを更新
    const updatedNotification = await NotificationModel.findByIdAndUpdate(
      notificationId,
      updateData,
      { new: true }
    );

    log.info('Notification updated', {
      adminId: req.admin._id.toString(),
      notificationId,
      changes: Object.keys(updateData)
    });

    res.json({
      success: true,
      notification: updatedNotification,
      message: 'お知らせを更新しました'
    });

  } catch (error) {
    log.error('Error updating notification', error, {
      adminId: req.admin?._id?.toString(),
      notificationId: req.params.id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// お知らせ削除
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin access required');
      return;
    }

    const notificationId = req.params.id;

    // お知らせを削除
    const deletedNotification = await NotificationModel.findByIdAndDelete(notificationId);
    if (!deletedNotification) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Notification not found');
      return;
    }

    // 関連する既読状態も削除
    await AdminNotificationReadStatusModel.deleteMany({
      notificationId: new mongoose.Types.ObjectId(notificationId)
    });

    log.info('Notification deleted', {
      adminId: req.admin._id.toString(),
      notificationId,
      title: deletedNotification.title
    });

    res.json({
      success: true,
      message: 'お知らせを削除しました'
    });

  } catch (error) {
    log.error('Error deleting notification', error, {
      adminId: req.admin?._id?.toString(),
      notificationId: req.params.id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// お知らせ詳細取得
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin access required');
      return;
    }

    const notificationId = req.params.id;

    const notification = await NotificationModel.findById(notificationId)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!notification) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Notification not found');
      return;
    }

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    log.error('Error fetching notification details', error, {
      adminId: req.admin?._id?.toString(),
      notificationId: req.params.id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 最近のエラーログ取得（デバッグ用）
router.get('/debug/recent-errors', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin access required');
      return;
    }

    // 最近のエラーログを取得（実装は簡易的）
    res.json({
      message: 'サーバーログを確認してください',
      hint: 'sudo journalctl -u charactier-backend -f でログを確認できます'
    });

  } catch (error) {
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

export default router;