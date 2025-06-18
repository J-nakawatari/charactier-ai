import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExchangeRate extends Document {
  baseCurrency: string;  // 'USD'
  targetCurrency: string;  // 'JPY'
  rate: number;  // 為替レート (例: 150.25)
  fetchedAt: Date;  // 取得日時
  source: string;  // データソース (例: 'exchangerate-api')
  isValid: boolean;  // 異常値チェック結果
  previousRate?: number;  // 前回レート (異常値判定用)
  createdAt: Date;
  updatedAt: Date;
}

// 静的メソッドの型定義
export interface IExchangeRateModel extends Model<IExchangeRate> {
  getLatestValidRate(baseCurrency?: string, targetCurrency?: string): Promise<number>;
  validateRate(newRate: number, baseCurrency?: string, targetCurrency?: string): Promise<{
    isValid: boolean;
    reason?: string;
    previousRate?: number;
  }>;
}

const ExchangeRateSchema: Schema = new Schema({
  baseCurrency: {
    type: String,
    required: true,
    uppercase: true,
    default: 'USD'
  },
  targetCurrency: {
    type: String,
    required: true,
    uppercase: true,
    default: 'JPY'
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  fetchedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  source: {
    type: String,
    required: true,
    default: 'exchangerate-api'
  },
  isValid: {
    type: Boolean,
    required: true,
    default: true
  },
  previousRate: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'exchange_rates'
});

// インデックス設定
ExchangeRateSchema.index({ baseCurrency: 1, targetCurrency: 1, fetchedAt: -1 });
ExchangeRateSchema.index({ fetchedAt: -1 });

// 最新の有効なレートを取得する静的メソッド
ExchangeRateSchema.statics.getLatestValidRate = async function(
  baseCurrency: string = 'USD',
  targetCurrency: string = 'JPY'
): Promise<number> {
  const latestRate = await this.findOne({
    baseCurrency,
    targetCurrency,
    isValid: true
  }).sort({ fetchedAt: -1 });

  if (latestRate) {
    return latestRate.rate;
  }

  // フォールバック: デフォルト値を返す
  console.warn(`⚠️ No valid exchange rate found for ${baseCurrency}/${targetCurrency}, using fallback rate: 150`);
  return 150;
};

// 為替レートの異常値チェック静的メソッド
ExchangeRateSchema.statics.validateRate = async function(
  newRate: number,
  baseCurrency: string = 'USD',
  targetCurrency: string = 'JPY'
): Promise<{ isValid: boolean; reason?: string; previousRate?: number }> {
  // 基本的な範囲チェック (USD/JPY)
  if (newRate < 100 || newRate > 200) {
    return {
      isValid: false,
      reason: `Rate ${newRate} is outside acceptable range (100-200)`
    };
  }

  // 前回レートとの比較
  const ExchangeRateModel = this;
  const previousRate = await (ExchangeRateModel as any).getLatestValidRate(baseCurrency, targetCurrency);
  if (previousRate) {
    const changePercent = Math.abs(newRate - previousRate) / previousRate * 100;
    
    // 20%以上の変動は異常値として扱う
    if (changePercent > 20) {
      return {
        isValid: false,
        reason: `Rate change of ${changePercent.toFixed(2)}% exceeds 20% threshold`,
        previousRate
      };
    }
  }

  return { isValid: true, previousRate };
};

export const ExchangeRateModel = mongoose.model<IExchangeRate, IExchangeRateModel>('ExchangeRate', ExchangeRateSchema);