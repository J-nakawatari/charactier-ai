// 共通型定義

/**
 * 多言語対応文字列
 */
export interface LocalizedString {
  ja: string;
  en: string;
}

/**
 * API共通レスポンス型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * ページネーション共通型
 */
export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * キャラクター基本型（フロントエンド・バックエンド共通）
 */
export interface BaseCharacter {
  _id: string;
  name: LocalizedString;
  description: LocalizedString;
  characterAccessType: 'free' | 'token-based' | 'purchaseOnly';
  aiModel: string;
  personalityPreset?: string;
  personalityTags?: string[];
  themeColor?: string;
  imageCharacterSelect?: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

/**
 * ユーザー基本型
 */
export interface BaseUser {
  _id: string;
  email: string;
  name: string;
  tokenBalance: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

/**
 * トークンパック基本型
 */
export interface BaseTokenPack {
  _id: string;
  name: string;
  description: string;
  tokens: number;
  price: number;
  isActive: boolean;
  createdAt: Date | string;
}

/**
 * 管理画面統計型
 */
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalTokensUsed: number;
  totalCharacters: number;
  apiErrors: number;
}

/**
 * ダッシュボード統計型
 */
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTokensUsed: number;
  totalCharacters: number;
  apiErrors: number;
}

/**
 * セキュリティイベント型
 */
export interface SecurityEvent {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  ipAddress: string;
  timestamp: string;
  user?: {
    id: string;
    email: string;
  };
  userAgent?: string;
}

/**
 * 通知型
 */
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  createdAt: string;
}

/**
 * フォームバリデーションエラー型
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * ユーザー統計型（管理画面用）
 */
export interface UserStats {
  month: string;
  activeUsers: number;
  newUsers: number;
}

/**
 * トークン使用量型（管理画面用）
 */
export interface TokenUsage {
  date: string;
  tokensUsed: number;
  revenue: number;
}

/**
 * ユーザーデータ型（管理画面用）
 */
export interface UserData {
  _id: string;
  id?: string;
  email: string;
  name: string;
  tokenBalance: number;
  isTrialUser: boolean;
  totalSpent: number;
  chatCount: number;
  lastLogin: string;
  isActive: boolean;
  status?: 'active' | 'inactive' | 'suspended';
  createdAt: string;
}

/**
 * API呼び出し状態型
 */
export interface ApiState<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * ギャラリー画像型
 */
export interface GalleryImage {
  _id?: string;
  url: string;
  title: LocalizedString;
  description: LocalizedString;
  unlockLevel: number;
  tags: string[];
}

export interface Character {
  _id: string;
  name: LocalizedString;
  description: LocalizedString;
  imageChatAvatar: string;
  imageChatBackground: string;
  imageCharacterSelect?: string;
  currentMood: 'happy' | 'sad' | 'angry' | 'shy' | 'excited';
  themeColor: string;
  characterAccessType?: 'initial' | 'premium' | 'free';
  model?: 'gpt-3.5-turbo' | 'gpt-4';
  personalityPreset?: string;
  personalityTags?: string[];
  // 管理画面・統計用プロパティ
  totalChats?: number;
  avgIntimacy?: number;
  isFree?: boolean;
  price?: number;
  isActive?: boolean;
  // ギャラリー画像配列
  galleryImages?: GalleryImage[];
}

export interface UserCharacterAffinity {
  level: number;
  currentExp: number;
  nextLevelExp: number;
  unlockedIllustrations: string[];
  currentMood?: 'excited' | 'melancholic' | 'happy' | 'sad' | 'angry' | 'neutral';
}

export interface TokenStatus {
  tokensRemaining: number;
  lastMessageCost: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens?: number;
}

export interface ChatData {
  character: Character;
  affinity: UserCharacterAffinity;
  tokenStatus: TokenStatus;
  messages: Message[];
}

// 多言語文字列取得のヘルパー関数
export function getLocalizedString(
  localizedString: LocalizedString | string,
  locale: string = 'ja'
): string {
  if (typeof localizedString === 'string') {
    return localizedString;
  }
  
  if (typeof localizedString === 'object' && localizedString !== null) {
    const key = locale === 'en' ? 'en' : 'ja';
    return localizedString[key] || localizedString.ja || Object.values(localizedString)[0] || '';
  }
  
  return '';
}