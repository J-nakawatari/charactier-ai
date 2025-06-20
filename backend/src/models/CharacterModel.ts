import mongoose, { Schema, Document } from 'mongoose';

// LocalizedString型
interface LocalizedString {
  ja: string;
  en: string;
}

// 親密度設定インターフェース
interface IAffinitySettings {
  maxLevel: number;
  experienceMultiplier: number;
  decayRate: number;
  decayThreshold: number;
  levelUpBonuses: {
    level: number;
    bonusType: 'image_unlock' | 'special_message' | 'feature_unlock' | 'gift_bonus';
    value: string;
  }[];
}

// レベル別報酬インターフェース
interface ILevelReward {
  level: number;
  rewardType: 'image' | 'voice' | 'message' | 'feature';
  rewardId: string;
  title: LocalizedString;
  description: LocalizedString;
  isActive: boolean;
}

// 特別メッセージインターフェース
interface ISpecialMessage {
  triggerType: 'level_up' | 'first_meeting' | 'birthday' | 'anniversary' | 'gift_received' | 'daily_login' | 'milestone';
  level?: number;
  condition?: string;
  message: LocalizedString;
  isActive: boolean;
  priority: number;
}

// ギフト設定インターフェース
interface IGiftPreference {
  giftType: string;
  preference: 'loves' | 'likes' | 'neutral' | 'dislikes' | 'hates';
  affinityBonus: number;
  experienceBonus: number;
  specialResponse: LocalizedString;
}

// ギャラリー画像インターフェース
interface IGalleryImage {
  url: string;
  unlockLevel: number;
  title: LocalizedString;
  description: LocalizedString;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  tags: string[];
  isDefault: boolean;
  order: number;
  createdAt: Date;
}

// キャラクターの型定義
export interface ICharacter extends Document {
  _id: string;
  
  // 多言語対応
  name: LocalizedString;
  description: LocalizedString;
  
  // AI・モデル設定
  aiModel: 'gpt-3.5-turbo' | 'gpt-4o-mini' | 'o4-mini';
  characterAccessType: 'free' | 'purchaseOnly';
  requiresUnlock: boolean;
  purchasePrice?: number; // 円
  
  // 性格システム
  personalityPreset: 'おっとり系' | '元気系' | 'クール系' | '真面目系' | 'セクシー系' | '天然系' | 'ボーイッシュ系' | 'お姉さん系' | 'ツンデレ';
  personalityTags: string[];
  gender: 'male' | 'female' | 'neutral';
  age?: string; // "18歳", "20代前半" など
  occupation?: string; // "学生", "OL", "お嬢様" など
  
  // プロンプト設定
  personalityPrompt: LocalizedString;
  adminPrompt?: LocalizedString; // オプショナルに変更
  systemPromptCache: LocalizedString; // 生成済みプロンプト
  
  // 視覚・音声
  voice?: string;
  themeColor: string;
  imageCharacterSelect?: string;
  imageDashboard?: string;
  imageChatBackground?: string;
  imageChatAvatar?: string;
  sampleVoiceUrl?: string;
  
  // ギャラリー画像（親密度解放）
  galleryImages: IGalleryImage[];
  
  // Stripe連携
  stripeProductId?: string;
  purchaseType?: 'buy';
  
  // メッセージ設定
  defaultMessage: LocalizedString;
  limitMessage?: LocalizedString; // オプショナルに変更
  
  // 親密度・報酬システム
  affinitySettings: IAffinitySettings;
  levelRewards: ILevelReward[];
  specialMessages: ISpecialMessage[];
  giftPreferences: IGiftPreference[];
  
  // 公開設定
  isActive: boolean;
  
  // 統計（管理画面用）
  totalUsers: number;
  totalMessages: number;
  averageAffinityLevel: number;
  totalRevenue: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// LocalizedStringのスキーマ
const LocalizedStringSchema = new Schema({
  ja: {
    type: String,
    required: true
  },
  en: {
    type: String,
    required: true
  }
}, { _id: false });

// AffinitySettings サブスキーマ
const AffinitySettingsSchema = new Schema({
  maxLevel: {
    type: Number,
    default: 100,
    min: 1,
    max: 100
  },
  experienceMultiplier: {
    type: Number,
    default: 1.0,
    min: 0.1,
    max: 5.0
  },
  decayRate: {
    type: Number,
    default: 0.1,
    min: 0,
    max: 1.0
  },
  decayThreshold: {
    type: Number,
    default: 7
  },
  levelUpBonuses: [{
    level: {
      type: Number,
      min: 1,
      max: 100
    },
    bonusType: {
      type: String,
      enum: ['image_unlock', 'special_message', 'feature_unlock', 'gift_bonus']
    },
    value: String
  }]
}, { _id: false });

// LevelReward サブスキーマ
const LevelRewardSchema = new Schema({
  level: {
    type: Number,
    min: 1,
    max: 100,
    required: true
  },
  rewardType: {
    type: String,
    enum: ['image', 'voice', 'message', 'feature'],
    required: true
  },
  rewardId: {
    type: String,
    required: true
  },
  title: {
    type: LocalizedStringSchema,
    required: true
  },
  description: {
    type: LocalizedStringSchema,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

// SpecialMessage サブスキーマ
const SpecialMessageSchema = new Schema({
  triggerType: {
    type: String,
    enum: ['level_up', 'first_meeting', 'birthday', 'anniversary', 'gift_received', 'daily_login', 'milestone'],
    required: true
  },
  level: Number,
  condition: String,
  message: {
    type: LocalizedStringSchema,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  }
}, { _id: false });

// GiftPreference サブスキーマ
const GiftPreferenceSchema = new Schema({
  giftType: {
    type: String,
    required: true
  },
  preference: {
    type: String,
    enum: ['loves', 'likes', 'neutral', 'dislikes', 'hates'],
    required: true
  },
  affinityBonus: {
    type: Number,
    min: -10,
    max: 20,
    default: 0
  },
  experienceBonus: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  specialResponse: {
    type: LocalizedStringSchema,
    required: true
  }
}, { _id: false });

// GalleryImage サブスキーマ
const GalleryImageSchema = new Schema({
  url: {
    type: String,
    required: true
  },
  unlockLevel: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  title: {
    type: LocalizedStringSchema,
    required: true
  },
  description: {
    type: LocalizedStringSchema,
    required: true
  },
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  tags: [String],
  isDefault: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
}, { 
  _id: false,
  timestamps: true
});

// キャラクターのスキーマ
const CharacterSchema = new Schema<ICharacter>({
  // 多言語対応基本情報
  name: {
    type: LocalizedStringSchema,
    required: true
  },
  description: {
    type: LocalizedStringSchema,
    required: true
  },
  
  // AI・モデル設定
  aiModel: {
    type: String,
    enum: ['gpt-3.5-turbo', 'gpt-4o-mini', 'o4-mini'],
    required: true,
    default: 'o4-mini'
  },
  characterAccessType: {
    type: String,
    enum: ['free', 'purchaseOnly'],
    required: true,
    default: 'free'
  },
  requiresUnlock: {
    type: Boolean,
    default: false
  },
  purchasePrice: {
    type: Number,
    min: 0
  },
  
  // 性格システム
  personalityPreset: {
    type: String,
    enum: ['おっとり系', '元気系', 'クール系', '真面目系', 'セクシー系', '天然系', 'ボーイッシュ系', 'お姉さん系', 'ツンデレ'],
    required: true
  },
  personalityTags: [{
    type: String,
    maxLength: 50
  }],
  gender: {
    type: String,
    enum: ['male', 'female', 'neutral'],
    required: true
  },
  age: String,
  occupation: String,
  
  // プロンプト設定
  personalityPrompt: {
    type: LocalizedStringSchema,
    required: true
  },
  adminPrompt: {
    type: LocalizedStringSchema,
    required: false // オプショナルに変更
  },
  systemPromptCache: {
    type: LocalizedStringSchema
  },
  
  // 視覚・音声
  voice: String,
  themeColor: {
    type: String,
    match: /^#[0-9A-Fa-f]{6}$/,
    default: '#8B5CF6'
  },
  imageCharacterSelect: String,
  imageDashboard: String,
  imageChatBackground: String,
  imageChatAvatar: String,
  sampleVoiceUrl: String,
  
  // ギャラリー画像（親密度解放）
  galleryImages: [GalleryImageSchema],
  
  // Stripe連携
  stripeProductId: String,
  purchaseType: {
    type: String,
    enum: ['buy']
  },
  
  // メッセージ設定
  defaultMessage: {
    type: LocalizedStringSchema,
    required: true
  },
  limitMessage: {
    type: LocalizedStringSchema,
    required: false // オプショナルに変更
  },
  
  // 親密度・報酬システム
  affinitySettings: {
    type: AffinitySettingsSchema,
    required: true
  },
  levelRewards: [LevelRewardSchema],
  specialMessages: [SpecialMessageSchema],
  giftPreferences: [GiftPreferenceSchema],
  
  // 公開設定
  isActive: {
    type: Boolean,
    default: true
  },
  
  // 統計（管理画面用）
  totalUsers: {
    type: Number,
    default: 0,
    min: 0
  },
  totalMessages: {
    type: Number,
    default: 0,
    min: 0
  },
  averageAffinityLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalRevenue: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  versionKey: false
});

// インデックス設定
CharacterSchema.index({ isActive: 1 });
CharacterSchema.index({ characterAccessType: 1 });
CharacterSchema.index({ createdAt: -1 });
CharacterSchema.index({ 'name.ja': 1 });
CharacterSchema.index({ 'name.en': 1 });

export const CharacterModel = mongoose.model<ICharacter>('Character', CharacterSchema);