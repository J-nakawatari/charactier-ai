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

export interface CharacterDocument {
  _id: string;
  name: LocalizedString;
  description: LocalizedString;
  characterAccessType: 'free' | 'token-based' | 'purchaseOnly';
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
}

export interface MockUser {
  id: string;
  email: string;
  isActive: boolean;
  tokenBalance: number;
}