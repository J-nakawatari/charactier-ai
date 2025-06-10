// 共通型定義

export interface LocalizedString {
  ja: string;
  en: string;
}

export interface Character {
  _id: string;
  name: LocalizedString;
  description: LocalizedString;
  imageChatAvatar: string;
  imageChatBackground: string;
  currentMood: 'happy' | 'sad' | 'angry' | 'shy' | 'excited';
  themeColor: string;
  characterAccessType?: 'initial' | 'premium';
  model?: 'gpt-3.5-turbo' | 'gpt-4';
  personalityPreset?: string;
  personalityTags?: string[];
}

export interface UserCharacterAffinity {
  level: number;
  currentExp: number;
  nextLevelExp: number;
  unlockedIllustrations: string[];
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