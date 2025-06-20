import mongoose, { Schema, Document } from 'mongoose';

export interface ITokenPack extends Document {
  name: string;
  description: string;
  tokens: number;
  price: number;
  priceId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  profitMargin?: number;
  tokenPerYen?: number;
}

const TokenPackSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  tokens: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 1
  },
  priceId: {
    type: String,
    unique: true,
    sparse: true, // null値の重複を許可
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profitMargin: {
    type: Number,
    default: 0
  },
  tokenPerYen: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true, // createdAt, updatedAt を自動生成
  versionKey: false // __v フィールドを無効化
});

// インデックス設定
TokenPackSchema.index({ isActive: 1, createdAt: -1 });

// バリデーション
TokenPackSchema.pre('save', function(next) {
  // tokenPerYenとprofitMarginのみ計算（tokensは管理画面の設定値を保持）
  if (this.tokens && this.price) {
    this.tokenPerYen = (this.tokens as number) / (this.price as number);
    
    // gpt-4o-mini原価モデルに基づく計算（参考値）
    // 平均原価: ($0.00000015 + 2 × $0.0000006) / 3 = $0.00000045/token
    // 円換算（150円/USD）: $0.00000045 × 150 = 0.0000675円/token
    const TOKEN_COST_PER_UNIT = 0.0000675;
    
    // 実際の利益率を計算
    const totalCost = (this.tokens as number) * TOKEN_COST_PER_UNIT;
    this.profitMargin = (((this.price as number) - totalCost) / (this.price as number)) * 100;
  }
  
  next();
});

export const TokenPackModel = mongoose.model<ITokenPack>('TokenPack', TokenPackSchema);