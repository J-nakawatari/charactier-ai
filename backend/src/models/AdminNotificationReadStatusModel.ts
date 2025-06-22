import mongoose, { Schema, Document } from 'mongoose';

/**
 * 管理者通知既読状態モデル
 * 各管理者がどの通知を既読したかを管理
 */

export interface IAdminNotificationReadStatus extends Document {
  adminId: mongoose.Types.ObjectId;        // 管理者ID
  notificationId: mongoose.Types.ObjectId;  // 通知ID
  isRead: boolean;                         // 既読フラグ
  readAt?: Date;                           // 既読日時
  createdAt: Date;
  updatedAt: Date;
}

const AdminNotificationReadStatusSchema = new Schema<IAdminNotificationReadStatus>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      index: true
    },
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
      required: true,
      index: true
    },
    isRead: {
      type: Boolean,
      default: false,
      required: true
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// 複合インデックス（adminIdとnotificationIdの組み合わせでユニーク）
AdminNotificationReadStatusSchema.index({ adminId: 1, notificationId: 1 }, { unique: true });

// 既読日時の自動設定
AdminNotificationReadStatusSchema.pre('save', function(next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

export const AdminNotificationReadStatusModel = mongoose.model<IAdminNotificationReadStatus>(
  'AdminNotificationReadStatus',
  AdminNotificationReadStatusSchema
);