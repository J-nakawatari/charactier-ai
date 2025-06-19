// TypeScript type definitions

// ユーザー名の安全変換ユーティリティ
export function ensureUserNameString(nameField: any): string {
  if (typeof nameField === 'string') return nameField;
  if (typeof nameField === 'object' && nameField?.name) return nameField.name;
  if (typeof nameField === 'object' && nameField?.ja) return nameField.ja;
  if (typeof nameField === 'object' && nameField?.en) return nameField.en;
  return 'Unknown User';
}

export interface LocalizedString {
  ja: string;
  en: string;
}

export interface AffinityStats {
  totalUsers: number;
  averageLevel: number;
  maxLevelUsers: number;
}

export interface CharacterTranslation {
  characterId: string;
  name: LocalizedString;
  description: LocalizedString;
  personalityPreset: LocalizedString;
  personalityTags: {
    ja: string[];
    en: string[];
  };
}

export interface CharacterDocument {
  _id: string;
  name: LocalizedString;
  description: LocalizedString;
  characterAccessType: 'free' | 'purchaseOnly'; // free = ベースキャラ, purchaseOnly = プレミアキャラ
  model: 'gpt-3.5-turbo' | 'gpt-4';
  gender?: 'female' | 'male' | 'other';
  personalityPreset?: string;
  personalityTags?: string[];
  themeColor?: string;
  imageCharacterSelect?: string;
  imageDashboard?: string;
  imageChatAvatar?: string;
  sampleVoiceUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
  
  // Optional fields that might exist in real data
  stripeProductId?: string;
  price?: number;
  affinityStats?: AffinityStats;
  defaultMessage?: LocalizedString;
  limitMessage?: LocalizedString;
  adminPrompt?: LocalizedString; // オプショナル - 削除予定
  translations?: CharacterTranslation; // Optional translation data for mock storage
}

export interface MockUser {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  tokenBalance: number;
  selectedCharacter?: {
    _id: string;
    name: LocalizedString | string;
  } | null;
  affinity?: { [characterId: string]: number };
}

export interface TokenPack {
  _id: string;
  name: string;
  description: string;
  tokens: number;
  price: number;
  priceId?: string; // Stripe Price ID
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  profitMargin?: number; // 自動計算される利益率
  tokenPerYen?: number; // 自動計算される1円あたりのトークン数
}