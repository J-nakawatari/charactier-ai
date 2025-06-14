import mongoose, { Schema, Document } from 'mongoose';

// ユーザーお知らせ既読状態インターフェース
export interface IUserNotificationReadStatus extends Document {
  _id: string;
  
  // 関連ID
  userId: mongoose.Types.ObjectId;
  notificationId: mongoose.Types.ObjectId;
  
  // 状態
  isRead: boolean;
  isViewed: boolean; // 表示されたかどうか（既読とは別）
  
  // タイムスタンプ
  viewedAt?: Date;
  readAt?: Date;
  
  // メタデータ
  createdAt: Date;
  updatedAt: Date;
}

// ユーザーお知らせ既読状態スキーマ
const UserNotificationReadStatusSchema = new Schema<IUserNotificationReadStatus>({
  // 関連ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: true
  },
  
  // 状態
  isRead: {
    type: Boolean,
    default: false
  },
  isViewed: {
    type: Boolean,
    default: false
  },
  
  // タイムスタンプ
  viewedAt: {
    type: Date
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true,
  versionKey: false
});

// 複合インデックス：ユーザーとお知らせの組み合わせは一意
UserNotificationReadStatusSchema.index(
  { userId: 1, notificationId: 1 }, 
  { unique: true }
);

// インデックス設定
UserNotificationReadStatusSchema.index({ userId: 1, isRead: 1 });
UserNotificationReadStatusSchema.index({ notificationId: 1, isRead: 1 });
UserNotificationReadStatusSchema.index({ userId: 1, readAt: -1 });

// 静的メソッド：ユーザーの未読お知らせ数取得
UserNotificationReadStatusSchema.statics.getUnreadCount = function(userId: string) {
  return this.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    isRead: false
  });
};

// 静的メソッド：ユーザーの既読状態一括取得
UserNotificationReadStatusSchema.statics.getUserReadStatuses = function(
  userId: string, 
  notificationIds: string[]
) {
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
    notificationId: { 
      $in: notificationIds.map(id => new mongoose.Types.ObjectId(id)) 
    }
  });
};

// 静的メソッド：お知らせの既読率取得
UserNotificationReadStatusSchema.statics.getNotificationReadRate = async function(
  notificationId: string
) {
  const total = await this.countDocuments({ 
    notificationId: new mongoose.Types.ObjectId(notificationId) 
  });
  const read = await this.countDocuments({ 
    notificationId: new mongoose.Types.ObjectId(notificationId),
    isRead: true 
  });
  
  return {
    total,
    read,
    rate: total > 0 ? (read / total) * 100 : 0
  };
};

// 静的メソッド：ユーザーのお知らせ表示記録
UserNotificationReadStatusSchema.statics.markAsViewed = async function(
  userId: string,
  notificationId: string
) {
  return this.findOneAndUpdate(
    {
      userId: new mongoose.Types.ObjectId(userId),
      notificationId: new mongoose.Types.ObjectId(notificationId)
    },
    {
      $setOnInsert: {
        userId: new mongoose.Types.ObjectId(userId),
        notificationId: new mongoose.Types.ObjectId(notificationId)
      },
      isViewed: true,
      viewedAt: new Date()
    },
    {
      upsert: true,
      new: true
    }
  );
};

// 静的メソッド：ユーザーのお知らせ既読記録
UserNotificationReadStatusSchema.statics.markAsRead = async function(
  userId: string,
  notificationId: string
) {
  return this.findOneAndUpdate(
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
    {
      upsert: true,
      new: true
    }
  );
};

// 静的メソッド：ユーザーの全お知らせ既読
UserNotificationReadStatusSchema.statics.markAllAsRead = async function(
  userId: string,
  notificationIds: string[]
) {
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
  
  return this.bulkWrite(operations);
};

// インスタンスメソッド：既読マーク
UserNotificationReadStatusSchema.methods.markRead = async function(
  this: IUserNotificationReadStatus
) {
  this.isRead = true;
  this.isViewed = true;
  this.readAt = new Date();
  if (!this.viewedAt) {
    this.viewedAt = new Date();
  }
  return this.save();
};

// インスタンスメソッド：表示マーク
UserNotificationReadStatusSchema.methods.markViewed = async function(
  this: IUserNotificationReadStatus
) {
  this.isViewed = true;
  this.viewedAt = new Date();
  return this.save();
};

export const UserNotificationReadStatusModel = mongoose.model<IUserNotificationReadStatus>(
  'UserNotificationReadStatus', 
  UserNotificationReadStatusSchema
);