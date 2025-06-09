const mongoose = require('mongoose');

/**
 * TokenUsage Schema（簡素化版）
 * シンプルなトークン使用履歴管理
 */
const tokenUsageSchema = new mongoose.Schema({
  // ユーザー情報
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // キャラクター情報
  characterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Character',
    required: true,
    index: true
  },
  
  // 使用情報（簡素化）
  tokensUsed: {
    type: Number,
    required: true,
    min: 1
  },
  
  // メッセージ情報（オプション）
  messageContent: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  
  // タイムスタンプ
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // セッション情報（オプション）
  sessionId: {
    type: String,
    default: null
  },
  
  // トークンタイプ（将来拡張用）
  tokenType: {
    type: String,
    enum: ['chat_message', 'character_response', 'system_operation'],
    default: 'chat_message'
  }
}, {
  timestamps: true
});

// インデックス設定（パフォーマンス最適化）
tokenUsageSchema.index({ userId: 1, timestamp: -1 });
tokenUsageSchema.index({ characterId: 1, timestamp: -1 });
tokenUsageSchema.index({ userId: 1, characterId: 1, timestamp: -1 });
tokenUsageSchema.index({ timestamp: -1 });
tokenUsageSchema.index({ sessionId: 1 });

// 仮想フィールド：推定コスト（参考用）
tokenUsageSchema.virtual('estimatedCostYen').get(function() {
  const gpt4CostPerToken = parseFloat(process.env.GPT4_COST_PER_TOKEN_YEN || '0.216');
  return (this.tokensUsed * gpt4CostPerToken).toFixed(3);
});

// 仮想フィールド：メッセージ長
tokenUsageSchema.virtual('messageLength').get(function() {
  return this.messageContent ? this.messageContent.length : 0;
});

// 静的メソッド：ユーザーの使用履歴取得
tokenUsageSchema.statics.getUserUsageHistory = async function(userId, limit = 50) {
  return await this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('characterId', 'name')
    .select('tokensUsed messageContent timestamp characterId tokenType sessionId');
};

// 静的メソッド：キャラクター別使用統計
tokenUsageSchema.statics.getCharacterUsageStats = async function(characterId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await this.aggregate([
    {
      $match: {
        characterId: new mongoose.Types.ObjectId(characterId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalTokensUsed: { $sum: '$tokensUsed' },
        totalMessages: { $sum: 1 },
        avgTokensPerMessage: { $avg: '$tokensUsed' },
        maxTokensInMessage: { $max: '$tokensUsed' },
        minTokensInMessage: { $min: '$tokensUsed' }
      }
    }
  ]);
  
  return stats.length > 0 ? {
    ...stats[0],
    period: `${days}日間`,
    estimatedCostYen: (stats[0].totalTokensUsed * parseFloat(process.env.GPT4_COST_PER_TOKEN_YEN || '0.216')).toFixed(2)
  } : {
    totalTokensUsed: 0,
    totalMessages: 0,
    avgTokensPerMessage: 0,
    maxTokensInMessage: 0,
    minTokensInMessage: 0,
    period: `${days}日間`,
    estimatedCostYen: '0.00'
  };
};

// 静的メソッド：ユーザー別使用統計
tokenUsageSchema.statics.getUserUsageStats = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const [generalStats, characterBreakdown] = await Promise.all([
    this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTokensUsed: { $sum: '$tokensUsed' },
          totalMessages: { $sum: 1 },
          avgTokensPerMessage: { $avg: '$tokensUsed' },
          avgMessageLength: { $avg: { $strLenCP: '$messageContent' } }
        }
      }
    ]),
    this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$characterId',
          tokensUsed: { $sum: '$tokensUsed' },
          messageCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'characters',
          localField: '_id',
          foreignField: '_id',
          as: 'character'
        }
      },
      {
        $project: {
          characterName: { $ifNull: [{ $arrayElemAt: ['$character.name.ja', 0] }, 'Unknown'] },
          tokensUsed: 1,
          messageCount: 1
        }
      },
      { $sort: { tokensUsed: -1 } }
    ])
  ]);
  
  const stats = generalStats.length > 0 ? generalStats[0] : {
    totalTokensUsed: 0,
    totalMessages: 0,
    avgTokensPerMessage: 0,
    avgMessageLength: 0
  };
  
  return {
    ...stats,
    period: `${days}日間`,
    estimatedCostYen: (stats.totalTokensUsed * parseFloat(process.env.GPT4_COST_PER_TOKEN_YEN || '0.216')).toFixed(2),
    characterBreakdown
  };
};

// 静的メソッド：システム全体の使用統計
tokenUsageSchema.statics.getSystemUsageStats = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const [dailyStats, topUsers, topCharacters] = await Promise.all([
    this.aggregate([
      {
        $match: { timestamp: { $gte: startDate } }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          tokensUsed: { $sum: '$tokensUsed' },
          messageCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]),
    this.aggregate([
      {
        $match: { timestamp: { $gte: startDate } }
      },
      {
        $group: {
          _id: '$userId',
          tokensUsed: { $sum: '$tokensUsed' },
          messageCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          userEmail: { $ifNull: [{ $arrayElemAt: ['$user.email', 0] }, 'Unknown'] },
          tokensUsed: 1,
          messageCount: 1
        }
      },
      { $sort: { tokensUsed: -1 } },
      { $limit: 10 }
    ]),
    this.aggregate([
      {
        $match: { timestamp: { $gte: startDate } }
      },
      {
        $group: {
          _id: '$characterId',
          tokensUsed: { $sum: '$tokensUsed' },
          messageCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'characters',
          localField: '_id',
          foreignField: '_id',
          as: 'character'
        }
      },
      {
        $project: {
          characterName: { $ifNull: [{ $arrayElemAt: ['$character.name.ja', 0] }, 'Unknown'] },
          tokensUsed: 1,
          messageCount: 1
        }
      },
      { $sort: { tokensUsed: -1 } },
      { $limit: 10 }
    ])
  ]);
  
  const totalTokens = dailyStats.reduce((sum, day) => sum + day.tokensUsed, 0);
  const totalMessages = dailyStats.reduce((sum, day) => sum + day.messageCount, 0);
  
  return {
    period: `${days}日間`,
    totalTokensUsed: totalTokens,
    totalMessages: totalMessages,
    avgTokensPerMessage: totalMessages > 0 ? (totalTokens / totalMessages).toFixed(2) : '0.00',
    estimatedCostYen: (totalTokens * parseFloat(process.env.GPT4_COST_PER_TOKEN_YEN || '0.216')).toFixed(2),
    dailyBreakdown: dailyStats.map(day => ({
      date: `${day._id.year}-${String(day._id.month).padStart(2, '0')}-${String(day._id.day).padStart(2, '0')}`,
      tokensUsed: day.tokensUsed,
      messageCount: day.messageCount,
      avgTokensPerMessage: day.messageCount > 0 ? (day.tokensUsed / day.messageCount).toFixed(2) : '0.00'
    })),
    topUsers,
    topCharacters
  };
};

// 静的メソッド：セッション別使用履歴
tokenUsageSchema.statics.getSessionUsage = async function(sessionId) {
  return await this.find({ sessionId })
    .sort({ timestamp: 1 })
    .populate('characterId', 'name')
    .select('tokensUsed messageContent timestamp characterId');
};

// インスタンスメソッド：詳細情報取得
tokenUsageSchema.methods.getDetailedInfo = function() {
  const gpt4CostPerToken = parseFloat(process.env.GPT4_COST_PER_TOKEN_YEN || '0.216');
  
  return {
    id: this._id,
    userId: this.userId,
    characterId: this.characterId,
    tokensUsed: this.tokensUsed,
    messageLength: this.messageLength,
    messagePreview: this.messageContent ? this.messageContent.substring(0, 100) + '...' : '',
    timestamp: this.timestamp,
    sessionId: this.sessionId,
    tokenType: this.tokenType,
    estimatedCostYen: (this.tokensUsed * gpt4CostPerToken).toFixed(3),
    tokensPerCharacter: this.messageLength > 0 ? (this.tokensUsed / this.messageLength).toFixed(3) : '0.000'
  };
};

module.exports = mongoose.model('TokenUsage', tokenUsageSchema);