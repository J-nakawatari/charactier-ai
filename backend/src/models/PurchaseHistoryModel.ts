import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPurchaseHistory extends Document {
  userId: mongoose.Types.ObjectId;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  type: 'token' | 'character' | 'subscription';
  amount: number; // トークン数またはアイテム数
  price: number; // 支払額（円）
  currency: string; // 通貨（JPY）
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  paymentMethod: string; // Stripeから取得した支払い方法
  details: string; // 商品説明
  description?: string; // 追加説明
  transactionId?: string; // 追跡用ID
  metadata?: {
    tokenPackId?: mongoose.Types.ObjectId;
    characterId?: mongoose.Types.ObjectId;
    subscriptionPlanId?: mongoose.Types.ObjectId;
    profitMargin?: number;
    originalAmount?: number;
    grantedTokens?: number;
    [key: string]: unknown;
  };
  stripeData?: {
    customer?: string;
    invoice?: string;
    subscription?: string;
    sessionId?: string;
    paymentIntentId?: string;
    mode?: string;
    [key: string]: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IPurchaseHistoryModel extends Model<IPurchaseHistory> {
  getUserPurchaseHistory(
    userId: mongoose.Types.ObjectId,
    options?: {
      limit?: number;
      skip?: number;
      type?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<IPurchaseHistory[]>;
  
  getUserPurchaseStats(
    userId: mongoose.Types.ObjectId
  ): Promise<Array<{
    _id: string;
    count: number;
    totalAmount: number;
    totalPrice: number;
  }>>;
  
  createFromStripeSession(sessionData: {
    userId: mongoose.Types.ObjectId;
    stripeSessionId: string;
    stripePaymentIntentId?: string;
    type: 'token' | 'character' | 'subscription';
    amount: number;
    price: number;
    currency: string;
    status: 'completed' | 'pending' | 'failed' | 'refunded';
    paymentMethod: string;
    details: string;
    description?: string;
    metadata?: Record<string, unknown>;
    stripeData?: Record<string, unknown>;
  }): Promise<IPurchaseHistory>;
  
  findByStripeSessionId(stripeSessionId: string): Promise<IPurchaseHistory | null>;
}

const PurchaseHistorySchema = new Schema<IPurchaseHistory>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  stripeSessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  stripePaymentIntentId: {
    type: String,
    index: true
  },
  type: {
    type: String,
    enum: ['token', 'character', 'subscription'],
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'JPY'
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed', 'refunded'],
    required: true,
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  transactionId: {
    type: String,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  stripeData: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// インデックス設定
PurchaseHistorySchema.index({ userId: 1, createdAt: -1 });
PurchaseHistorySchema.index({ status: 1, createdAt: -1 });
PurchaseHistorySchema.index({ type: 1, status: 1 });

// 静的メソッド：ユーザーの購入履歴取得
PurchaseHistorySchema.statics.getUserPurchaseHistory = function(
  userId: mongoose.Types.ObjectId,
  options: {
    limit?: number;
    skip?: number;
    type?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
) {
  const {
    limit = 50,
    skip = 0,
    type,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const filter: Record<string, unknown> = { userId };
  
  if (type && type !== 'all') {
    filter.type = type;
  }
  
  if (status && status !== 'all') {
    filter.status = status;
  }

  const sort: Record<string, 1 | -1> = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  return this.find(filter)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();
};

// 静的メソッド：ユーザーの購入統計取得
PurchaseHistorySchema.statics.getUserPurchaseStats = function(
  userId: mongoose.Types.ObjectId
) {
  return this.aggregate([
    {
      $match: {
        userId: userId,
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalPrice: { $sum: '$price' }
      }
    }
  ]);
};

// 静的メソッド：Stripeデータから購入履歴を作成
PurchaseHistorySchema.statics.createFromStripeSession = function(
  sessionData: {
    userId: mongoose.Types.ObjectId;
    stripeSessionId: string;
    stripePaymentIntentId?: string;
    type: 'token' | 'character' | 'subscription';
    amount: number;
    price: number;
    currency: string;
    status: 'completed' | 'pending' | 'failed' | 'refunded';
    paymentMethod: string;
    details: string;
    description?: string;
    metadata?: Record<string, unknown>;
    stripeData?: Record<string, unknown>;
  }
) {
  return this.create({
    userId: sessionData.userId,
    stripeSessionId: sessionData.stripeSessionId,
    stripePaymentIntentId: sessionData.stripePaymentIntentId,
    type: sessionData.type,
    amount: sessionData.amount,
    price: sessionData.price,
    currency: sessionData.currency || 'JPY',
    status: sessionData.status,
    paymentMethod: sessionData.paymentMethod,
    details: sessionData.details,
    description: sessionData.description,
    metadata: sessionData.metadata || {},
    stripeData: sessionData.stripeData || {}
  });
};

// 静的メソッド：既存の購入履歴をセッションIDで検索
PurchaseHistorySchema.statics.findByStripeSessionId = function(
  stripeSessionId: string
) {
  return this.findOne({ stripeSessionId });
};

export const PurchaseHistoryModel = mongoose.model<IPurchaseHistory, IPurchaseHistoryModel>('PurchaseHistory', PurchaseHistorySchema);