import mongoose, { Document, Schema } from 'mongoose';

export interface IViolationRecord extends Document {
  userId: mongoose.Types.ObjectId;
  violationType: 'blocked_word' | 'openai_moderation';
  detectedWord?: string;
  reason: string;
  severityLevel: number;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  messageContent: string;
  moderationCategories?: Map<string, boolean>;
  isResolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  
  // 旧フィールドとの互換性
  originalMessage?: string;
  violationReason?: string;
  detectedWords?: string[];
  severity?: number;
  processed?: boolean;
  
  // インスタンスメソッド
  calculateSeverityLevel(): number;
}

const violationRecordSchema = new Schema<IViolationRecord>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  violationType: {
    type: String,
    enum: ['blocked_word', 'openai_moderation'],
    required: true
  },
  detectedWord: {
    type: String,
    required: function() {
      return this.violationType === 'blocked_word';
    }
  },
  reason: {
    type: String,
    required: true
  },
  severityLevel: {
    type: Number,
    min: 1,
    max: 3,
    default: 1
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  messageContent: {
    type: String,
    required: true,
    maxlength: 2000
  },
  moderationCategories: {
    type: Map,
    of: Boolean,
    default: {}
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  },
  
  // 旧システムとの互換性フィールド
  originalMessage: {
    type: String,
    get: function() { return this.messageContent; },
    set: function(value: string) { this.messageContent = value; }
  },
  violationReason: {
    type: String,
    get: function() { return this.reason; },
    set: function(value: string) { this.reason = value; }
  },
  detectedWords: {
    type: [String],
    get: function() { return this.detectedWord ? [this.detectedWord] : []; },
    set: function(value: string[]) { this.detectedWord = value?.[0]; }
  },
  severity: {
    type: Number,
    get: function() { return this.severityLevel; },
    set: function(value: number) { this.severityLevel = value; }
  },
  processed: {
    type: Boolean,
    get: function() { return this.isResolved; },
    set: function(value: boolean) { this.isResolved = value; }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
});

// インデックス設定
violationRecordSchema.index({ userId: 1, timestamp: -1 });
violationRecordSchema.index({ violationType: 1, timestamp: -1 });
violationRecordSchema.index({ severityLevel: 1, timestamp: -1 });

// 仮想フィールド：違反から経過時間
violationRecordSchema.virtual('timeElapsed').get(function() {
  return Date.now() - this.timestamp.getTime();
});

// 静的メソッド：ユーザーの違反回数取得
violationRecordSchema.statics.getViolationCount = async function(userId: mongoose.Types.ObjectId, timeframe?: number) {
  const query: any = { userId, isResolved: false };
  
  if (timeframe) {
    const timeLimit = new Date(Date.now() - timeframe);
    query.timestamp = { $gte: timeLimit };
  }
  
  return await this.countDocuments(query);
};

// 静的メソッド：ユーザーの最新違反取得
violationRecordSchema.statics.getLatestViolations = async function(userId: mongoose.Types.ObjectId, limit: number = 10) {
  return await this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .exec();
};

// 静的メソッド：違反統計取得
violationRecordSchema.statics.getViolationStats = async function(timeframe: number = 24 * 60 * 60 * 1000) {
  const timeLimit = new Date(Date.now() - timeframe);
  
  const stats = await this.aggregate([
    { $match: { timestamp: { $gte: timeLimit } } },
    {
      $group: {
        _id: '$violationType',
        count: { $sum: 1 },
        avgSeverity: { $avg: '$severityLevel' }
      }
    }
  ]);
  
  return stats;
};

// インスタンスメソッド：重要度レベル自動判定
violationRecordSchema.methods.calculateSeverityLevel = function() {
  const content = this.messageContent.toLowerCase();
  
  // 高リスクキーワード
  const highRiskWords = ['殺', 'kill', '死ね', 'die', '暴力', 'violence', 'テロ', 'terror'];
  const mediumRiskWords = ['エロ', 'sex', '薬物', 'drug', 'ヘイト', 'hate'];
  
  if (highRiskWords.some(word => content.includes(word))) {
    this.severityLevel = 3;
  } else if (mediumRiskWords.some(word => content.includes(word))) {
    this.severityLevel = 2;
  } else {
    this.severityLevel = 1;
  }
  
  return this.severityLevel;
};

// 保存前の処理
violationRecordSchema.pre('save', function(next) {
  if (this.isNew && !this.severityLevel) {
    this.calculateSeverityLevel();
  }
  next();
});

export const ViolationRecordModel = mongoose.model<IViolationRecord>('ViolationRecord', violationRecordSchema);