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
  // GPT-4原価モデルに基づく計算
  const TOKEN_COST_PER_UNIT = 0.003;
  
  // 自動計算フィールドを更新
  const totalCost = (this.tokens as number) * TOKEN_COST_PER_UNIT;
  this.profitMargin = (((this.price as number) - totalCost) / (this.price as number)) * 100;
  this.tokenPerYen = (this.tokens as number) / (this.price as number);
  
  next();
});

export const TokenPackModel = mongoose.model<ITokenPack>('TokenPack', TokenPackSchema);