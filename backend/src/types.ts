// TypeScript type definitions

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
  characterAccessType: 'initial' | 'premium'; // initial = 初期開放, premium = 課金キャラ
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
  adminPrompt?: LocalizedString;
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
}