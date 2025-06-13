const mongoose = require('mongoose');

/**
 * UserTokenPack Schema（簡素化版）
 * 50%利益保証を実現するシンプルなトークンパック管理
 */
const userTokenPackSchema = new mongoose.Schema({
  // ユーザー情報
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Stripe情報
  stripeSessionId: {
    type: String,
    required: true,
    unique: true
  },
  stripeProductId: {
    type: String,
    default: null
  },
  stripePriceId: {
    type: String,
    default: null
  },
  
  // 購入情報（簡素化）
  purchaseAmountYen: {
    type: Number,
    required: true,
    min: 1
  },
  tokensPurchased: {
    type: Number,
    required: true,
    min: 1
  },
  tokensRemaining: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(value) {
        return value <= this.tokensPurchased;
      },
      message: '残りトークン数が購入トークン数を超えています'
    }
  },
  
  // 状態管理
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // 利益管理（参考情報）
  profitMarginUsed: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 1
  },
  gpt4CostPerTokenYen: {
    type: Number,
    default: 0.216
  }
}, {
  timestamps: true
});

// インデックス設定（パフォーマンス最適化）
userTokenPackSchema.index({ userId: 1, purchaseDate: -1 });
userTokenPackSchema.index({ userId: 1, isActive: 1, tokensRemaining: 1 });

// 仮想フィールド：使用率
userTokenPackSchema.virtual('usageRate').get(function() {
  if (this.tokensPurchased === 0) return 0;
  return ((this.tokensPurchased - this.tokensRemaining) / this.tokensPurchased * 100).toFixed(1);
});

// 仮想フィールド：推定利益
userTokenPackSchema.virtual('estimatedProfit').get(function() {
  const apiCost = (this.tokensPurchased - this.tokensRemaining) * this.gpt4CostPerTokenYen;
  return Math.max(0, this.purchaseAmountYen - apiCost);
});

// 仮想フィールド：実際の利益率
userTokenPackSchema.virtual('actualProfitMargin').get(function() {
  if (this.purchaseAmountYen === 0) return 0;
  const estimatedProfit = this.estimatedProfit;
  return (estimatedProfit / this.purchaseAmountYen * 100).toFixed(2);
});

// 静的メソッド：ユーザーのアクティブなトークンパック取得
userTokenPackSchema.statics.getActivePacksByUser = async function(userId) {
  return await this.find({
    userId,
    isActive: true,
    tokensRemaining: { $gt: 0 }
  }).sort({ purchaseDate: 1 }); // FIFO順
};

// 静的メソッド：ユーザーの総トークン残高計算
userTokenPackSchema.statics.calculateUserTokenBalance = async function(userId) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        totalRemaining: { $sum: '$tokensRemaining' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0].totalRemaining : 0;
};

// 静的メソッド：システム全体の統計取得
userTokenPackSchema.statics.getSystemStats = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await this.aggregate([
    { $match: { purchaseDate: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$purchaseAmountYen' },
        totalTokensSold: { $sum: '$tokensPurchased' },
        totalTokensRemaining: { $sum: '$tokensRemaining' },
        totalPurchases: { $sum: 1 },
        avgPurchaseAmount: { $avg: '$purchaseAmountYen' },
        avgTokensPerPurchase: { $avg: '$tokensPurchased' }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      totalRevenue: 0,
      totalTokensSold: 0,
      totalTokensUsed: 0,
      totalTokensRemaining: 0,
      totalPurchases: 0,
      avgPurchaseAmount: 0,
      avgTokensPerPurchase: 0,
      period: `${days}日間`
    };
  }
  
  const result = stats[0];
  result.totalTokensUsed = result.totalTokensSold - result.totalTokensRemaining;
  result.period = `${days}日間`;
  
  return result;
};

// 静的メソッド：特定期間の収益分析
userTokenPackSchema.statics.getProfitAnalysis = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const packs = await this.find({ purchaseDate: { $gte: startDate } });
  
  let totalRevenue = 0;
  let totalApiCost = 0;
  let totalProfit = 0;
  
  for (const pack of packs) {
    const tokensUsed = pack.tokensPurchased - pack.tokensRemaining;
    const apiCost = tokensUsed * pack.gpt4CostPerTokenYen;
    const profit = pack.purchaseAmountYen - apiCost;
    
    totalRevenue += pack.purchaseAmountYen;
    totalApiCost += apiCost;
    totalProfit += profit;
  }
  
  return {
    period: `${days}日間`,
    totalRevenue: totalRevenue.toFixed(2),
    totalApiCost: totalApiCost.toFixed(2),
    totalProfit: totalProfit.toFixed(2),
    profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : '0.00',
    totalPacks: packs.length
  };
};

// インスタンスメソッド：トークン消費
userTokenPackSchema.methods.consumeTokens = async function(tokensToConsume) {
  if (tokensToConsume > this.tokensRemaining) {
    throw new Error(`トークン不足: 要求${tokensToConsume}, 残高${this.tokensRemaining}`);
  }
  
  this.tokensRemaining -= tokensToConsume;
  
  if (this.tokensRemaining === 0) {
    this.isActive = false;
  }
  
  return await this.save();
};

// インスタンスメソッド：パック情報の詳細取得
userTokenPackSchema.methods.getDetailedInfo = function() {
  const tokensUsed = this.tokensPurchased - this.tokensRemaining;
  const apiCost = tokensUsed * this.gpt4CostPerTokenYen;
  const profit = this.purchaseAmountYen - apiCost;
  const profitMargin = this.purchaseAmountYen > 0 ? (profit / this.purchaseAmountYen * 100) : 0;
  
  return {
    id: this._id,
    stripeSessionId: this.stripeSessionId,
    purchaseAmountYen: this.purchaseAmountYen,
    tokensPurchased: this.tokensPurchased,
    tokensRemaining: this.tokensRemaining,
    tokensUsed: tokensUsed,
    usageRate: this.usageRate,
    isActive: this.isActive,
    purchaseDate: this.purchaseDate,
    // 利益情報
    apiCost: apiCost.toFixed(2),
    profit: profit.toFixed(2),
    profitMargin: profitMargin.toFixed(2) + '%',
    profitMarginUsed: this.profitMarginUsed,
    gpt4CostPerTokenYen: this.gpt4CostPerTokenYen,
    // 推定情報
    estimatedMessages: Math.floor(tokensUsed / 150), // 1メッセージ約150トークンと仮定
    costEfficiency: tokensUsed > 0 ? (this.purchaseAmountYen / tokensUsed).toFixed(3) : '0.000'
  };
};

// 保存前の処理
userTokenPackSchema.pre('save', function(next) {
  // tokensRemainingがマイナスにならないようにする
  if (this.tokensRemaining < 0) {
    this.tokensRemaining = 0;
  }
  
  // tokensRemainingが0になったらisActiveをfalseにする
  if (this.tokensRemaining === 0 && this.isActive) {
    this.isActive = false;
  }
  
  next();
});

// 削除前の処理（論理削除の場合）
userTokenPackSchema.pre('remove', function(next) {
  console.log(`🗑️ UserTokenPack削除: ${this.stripeSessionId} (${this.tokensPurchased}トークン)`);
  next();
});

module.exports = mongoose.model('UserTokenPack', userTokenPackSchema);