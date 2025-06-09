const mongoose = require('mongoose');

const violationRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
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
  // OpenAI Moderation API結果（該当する場合）
  moderationCategories: {
    type: Map,
    of: Boolean,
    default: {}
  },
  // 違反が解決済みかどうか
  isResolved: {
    type: Boolean,
    default: false
  },
  // 解決した管理者ID
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // 解決日時
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
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
violationRecordSchema.statics.getViolationCount = async function(userId, timeframe = null) {
  const query = { userId, isResolved: false };
  
  if (timeframe) {
    const timeLimit = new Date(Date.now() - timeframe);
    query.timestamp = { $gte: timeLimit };
  }
  
  return await this.countDocuments(query);
};

// 静的メソッド：ユーザーの最新違反取得
violationRecordSchema.statics.getLatestViolations = async function(userId, limit = 10) {
  return await this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .exec();
};

// 静的メソッド：違反統計取得
violationRecordSchema.statics.getViolationStats = async function(timeframe = 24 * 60 * 60 * 1000) {
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

module.exports = mongoose.model('ViolationRecord', violationRecordSchema);