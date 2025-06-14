import mongoose, { Schema, Document } from 'mongoose';

// LocalizedString型
interface LocalizedString {
  ja: string;
  en: string;
}

// 対象ユーザー条件インターフェース
interface ITargetCondition {
  type: 'all' | 'specific_users' | 'user_level' | 'purchase_history' | 'registration_date';
  userIds?: string[];
  minLevel?: number;
  maxLevel?: number;
  hasPurchases?: boolean;
  registeredAfter?: Date;
  registeredBefore?: Date;
}

// お知らせモデルインターフェース
export interface INotification extends Document {
  _id: string;
  
  // 基本情報
  title: LocalizedString;
  message: LocalizedString;
  type: 'info' | 'warning' | 'success' | 'urgent' | 'maintenance' | 'feature' | 'event';
  
  // 表示設定
  isActive: boolean;
  isPinned: boolean; // 重要なお知らせを上部固定
  priority: number; // 表示順序（数値が大きいほど上）
  
  // 対象・条件
  targetCondition: ITargetCondition;
  
  // 有効期限
  validFrom: Date;
  validUntil?: Date;
  
  // 統計
  totalTargetUsers: number;
  totalViews: number;
  totalReads: number;
  
  // メタデータ
  createdBy: mongoose.Types.ObjectId; // 作成した管理者
  updatedBy?: mongoose.Types.ObjectId; // 最終更新した管理者
  
  createdAt: Date;
  updatedAt: Date;
  
  // インスタンスメソッド
  incrementView(): Promise<void>;
  incrementRead(): Promise<void>;
  isTargetUser(user: any): boolean;
}

// LocalizedStringスキーマ
const LocalizedStringSchema = new Schema({
  ja: {
    type: String,
    required: true,
    maxLength: 500
  },
  en: {
    type: String,
    required: true,
    maxLength: 500
  }
}, { _id: false });

// 対象条件スキーマ
const TargetConditionSchema = new Schema({
  type: {
    type: String,
    enum: ['all', 'specific_users', 'user_level', 'purchase_history', 'registration_date'],
    required: true,
    default: 'all'
  },
  userIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  minLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  maxLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  hasPurchases: Boolean,
  registeredAfter: Date,
  registeredBefore: Date
}, { _id: false });

// お知らせスキーマ
const NotificationSchema = new Schema<INotification>({
  // 基本情報
  title: {
    type: LocalizedStringSchema,
    required: true
  },
  message: {
    type: LocalizedStringSchema,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'urgent', 'maintenance', 'feature', 'event'],
    required: true,
    default: 'info'
  },
  
  // 表示設定
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // 対象・条件
  targetCondition: {
    type: TargetConditionSchema,
    required: true
  },
  
  // 有効期限
  validFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  validUntil: {
    type: Date,
    validate: {
      validator: function(this: INotification, value: Date) {
        return !value || value > this.validFrom;
      },
      message: '有効期限は開始日より後に設定してください'
    }
  },
  
  // 統計
  totalTargetUsers: {
    type: Number,
    default: 0,
    min: 0
  },
  totalViews: {
    type: Number,
    default: 0,
    min: 0
  },
  totalReads: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // メタデータ
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  versionKey: false
});

// インデックス設定
NotificationSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
NotificationSchema.index({ isPinned: -1, priority: -1, createdAt: -1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ createdBy: 1 });

// 仮想フィールド：読了率
NotificationSchema.virtual('readRate').get(function(this: INotification) {
  return this.totalTargetUsers > 0 ? (this.totalReads / this.totalTargetUsers) * 100 : 0;
});

// 仮想フィールド：有効期限チェック
NotificationSchema.virtual('isValid').get(function(this: INotification) {
  const now = new Date();
  return this.validFrom <= now && (!this.validUntil || this.validUntil >= now);
});

// 静的メソッド：アクティブなお知らせ取得
NotificationSchema.statics.getActiveNotifications = function(
  userId?: string,
  locale: string = 'ja'
) {
  const now = new Date();
  return this.find({
    isActive: true,
    validFrom: { $lte: now },
    $or: [
      { validUntil: { $exists: false } },
      { validUntil: { $gte: now } }
    ]
  })
  .sort({ isPinned: -1, priority: -1, createdAt: -1 })
  .populate('createdBy', 'name email');
};

// インスタンスメソッド：対象ユーザーかどうかチェック
NotificationSchema.methods.isTargetUser = function(this: INotification, user: any): boolean {
  const condition = this.targetCondition;
  
  switch (condition.type) {
    case 'all':
      return true;
      
    case 'specific_users':
      return condition.userIds?.some(id => id.toString() === user._id.toString()) || false;
      
    case 'user_level':
      // ユーザーの平均親密度レベルで判定
      const userLevel = user.affinities?.reduce((sum: number, aff: any) => sum + aff.level, 0) / (user.affinities?.length || 1) || 0;
      return (!condition.minLevel || userLevel >= condition.minLevel) &&
             (!condition.maxLevel || userLevel <= condition.maxLevel);
             
    case 'purchase_history':
      const hasPurchases = user.purchasedCharacters?.length > 0 || user.tokenPurchases?.length > 0;
      return condition.hasPurchases === undefined || condition.hasPurchases === hasPurchases;
      
    case 'registration_date':
      const regDate = new Date(user.createdAt);
      return (!condition.registeredAfter || regDate >= condition.registeredAfter) &&
             (!condition.registeredBefore || regDate <= condition.registeredBefore);
             
    default:
      return false;
  }
};

// インスタンスメソッド：統計更新
NotificationSchema.methods.incrementView = async function(this: INotification) {
  await NotificationModel.findByIdAndUpdate(this._id, { $inc: { totalViews: 1 } });
};

NotificationSchema.methods.incrementRead = async function(this: INotification) {
  await NotificationModel.findByIdAndUpdate(this._id, { $inc: { totalReads: 1 } });
};

export const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema);