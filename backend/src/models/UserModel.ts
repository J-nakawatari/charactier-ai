import mongoose, { Schema, Document } from 'mongoose';

// 気分修飾子データ
interface IMoodModifier {
  type: string; // 'excited', 'melancholic', etc.
  strength: number; // 0-1
  expiresAt: Date;
}

// 気分履歴データ
interface IMoodHistory {
  mood: string;
  intensity: number;
  triggeredBy: string;
  duration: number;
  createdAt: Date;
}

// 親密度・関係性データ
interface IAffinity {
  character: string; // ObjectId
  
  // 基本親密度指標
  level: number; // 0-100
  experience: number;
  experienceToNext: number;
  
  // 関係性状態
  emotionalState: 'happy' | 'excited' | 'calm' | 'sad' | 'angry' | 'neutral' | 'melancholic';
  relationshipType: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'lover';
  trustLevel: number; // 0-100
  intimacyLevel: number; // 0-100
  
  // 会話統計
  totalConversations: number;
  totalMessages: number;
  averageResponseTime: number;
  lastInteraction: Date;
  
  // ストリーク・継続性
  currentStreak: number;
  maxStreak: number;
  consecutiveDays: number;
  
  // 個性・記憶
  favoriteTopics: string[];
  specialMemories: string[];
  personalNotes: string;
  
  // ギフト・報酬
  giftsReceived: {
    giftType: string;
    giftName: string;
    value: number;
    senderId: string; // ObjectId
    sentAt: Date;
    affinityBonus: number;
    experienceBonus: number;
    message: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  }[];
  totalGiftsValue: number;
  
  // レベル進行管理
  unlockedRewards: string[]; // 解放済み報酬ID
  unlockedImages: {
    imageId: string;
    unlockedAt: Date;
  }[];
  nextRewardLevel: number;
  nextUnlockLevel: number;
  
  // 感情変化・状態遷移（MoodEngine用）
  moodHistory: IMoodHistory[];
  currentMoodModifiers: IMoodModifier[];
}

export interface IUser extends Document {
  _id: string;
  
  // 基本認証情報
  email: string;
  name: string;
  password: string;
  preferredLanguage: 'ja' | 'en';
  isAdmin: boolean;
  
  // メール認証
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  
  // キャラクター関連
  selectedCharacter?: string; // ObjectId
  purchasedCharacters: string[]; // ObjectId[]
  
  // トークン・課金
  tokenBalance: number;
  activeTokenPackId?: string; // ObjectId
  totalSpent: number;
  
  // セキュリティ・制裁
  violationCount: number;
  warningCount: number;
  accountStatus: 'active' | 'inactive' | 'suspended' | 'banned' | 'warned' | 'chat_suspended' | 'account_suspended' | 'deleted';
  suspensionEndDate?: Date;
  banReason?: string;
  lastViolationDate?: Date;
  
  // アクティビティ
  registrationDate: Date;
  lastLogin: Date;
  loginStreak: number;
  maxLoginStreak: number;
  
  // 統計・分析用
  totalChatMessages: number;
  averageSessionDuration: number;
  favoriteCharacterTypes: string[];
  
  // 親密度システム
  affinities: IAffinity[];
  
  // システム管理
  isActive: boolean;
  isSetupComplete: boolean; // 初回セットアップ完了フラグ
  createdAt: Date;
  updatedAt: Date;
}

// 気分修飾子サブスキーマ
const MoodModifierSchema = new Schema({
  type: {
    type: String,
    required: true
  },
  strength: {
    type: Number,
    default: 1,
    min: 0,
    max: 1
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true // Cronジョブ用インデックス
  }
}, { _id: false });

// 気分履歴サブスキーマ
const MoodHistorySchema = new Schema({
  mood: {
    type: String,
    required: true
  },
  intensity: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  triggeredBy: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// 親密度サブスキーマ
const AffinitySchema = new Schema({
  character: {
    type: Schema.Types.ObjectId,
    ref: 'Character',
    required: true
  },
  
  // 基本親密度指標
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  experienceToNext: {
    type: Number,
    default: 100
  },
  
  // 関係性状態
  emotionalState: {
    type: String,
    enum: ['happy', 'excited', 'calm', 'sad', 'angry', 'neutral', 'melancholic'],
    default: 'neutral'
  },
  relationshipType: {
    type: String,
    enum: ['stranger', 'acquaintance', 'friend', 'close_friend', 'lover'],
    default: 'stranger'
  },
  trustLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  intimacyLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // 会話統計
  totalConversations: {
    type: Number,
    default: 0
  },
  totalMessages: {
    type: Number,
    default: 0
  },
  averageResponseTime: {
    type: Number,
    default: 0
  },
  lastInteraction: Date,
  
  // ストリーク・継続性
  currentStreak: {
    type: Number,
    default: 0
  },
  maxStreak: {
    type: Number,
    default: 0
  },
  consecutiveDays: {
    type: Number,
    default: 0
  },
  
  // 個性・記憶
  favoriteTopics: [String],
  specialMemories: [String],
  personalNotes: String,
  
  // ギフト・報酬
  giftsReceived: [{
    giftType: String,
    giftName: String,
    value: Number,
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    affinityBonus: Number,
    experienceBonus: Number,
    message: String,
    rarity: {
      type: String,
      enum: ['common', 'rare', 'epic', 'legendary'],
      default: 'common'
    }
  }],
  totalGiftsValue: {
    type: Number,
    default: 0
  },
  
  // レベル進行管理
  unlockedRewards: [String],
  unlockedImages: [{
    imageId: String,
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  }],
  nextRewardLevel: {
    type: Number,
    default: 10
  },
  nextUnlockLevel: {
    type: Number,
    default: 10
  },
  
  // 感情変化・状態遷移（MoodEngine用）
  moodHistory: [MoodHistorySchema],
  currentMoodModifiers: [MoodModifierSchema]
}, { _id: false });

const UserSchema: Schema = new Schema({
  // 基本認証情報
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: false,
    trim: true,
    default: '',
    // Ensure only strings are saved
    set: function(value: any) {
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value?.name) return value.name;
      if (typeof value === 'object' && value?.ja) return value.ja;
      if (typeof value === 'object' && value?.en) return value.en;
      return 'Unknown User';
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  preferredLanguage: {
    type: String,
    enum: ['ja', 'en'],
    default: 'ja'
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  
  // メール認証
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false // セキュリティのため通常のクエリでは取得しない
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  
  // キャラクター関連
  selectedCharacter: {
    type: Schema.Types.ObjectId,
    ref: 'Character'
  },
  purchasedCharacters: [{
    type: Schema.Types.ObjectId,
    ref: 'Character'
  }],
  
  // トークン・課金
  tokenBalance: {
    type: Number,
    default: 10000, // 初回登録時に10,000トークン付与
    min: 0
  },
  activeTokenPackId: {
    type: Schema.Types.ObjectId,
    ref: 'TokenPack'
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // セキュリティ・制裁
  violationCount: {
    type: Number,
    default: 0,
    min: 0
  },
  warningCount: {
    type: Number,
    default: 0,
    min: 0
  },
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'banned', 'warned', 'chat_suspended', 'account_suspended', 'deleted'],
    default: 'active'
  },
  suspensionEndDate: Date,
  banReason: String,
  lastViolationDate: Date,
  
  // アクティビティ
  registrationDate: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date,
  loginStreak: {
    type: Number,
    default: 0
  },
  maxLoginStreak: {
    type: Number,
    default: 0
  },
  
  // 統計・分析用
  totalChatMessages: {
    type: Number,
    default: 0
  },
  averageSessionDuration: {
    type: Number,
    default: 0
  },
  favoriteCharacterTypes: [String],
  
  // 親密度システム
  affinities: [AffinitySchema],
  
  // システム管理
  isActive: {
    type: Boolean,
    default: true
  },
  isSetupComplete: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  versionKey: false
});

// インデックス設定
UserSchema.index({ createdAt: -1 });

export const UserModel = mongoose.model<IUser>('User', UserSchema);