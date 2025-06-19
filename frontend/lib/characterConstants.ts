// キャラクター定数の定義

export const PERSONALITY_PRESETS = {
  'おっとり系': {
    ja: 'おっとり系',
    en: 'Gentle'
  },
  '元気系': {
    ja: '元気系',
    en: 'Energetic'
  },
  'クール系': {
    ja: 'クール系',
    en: 'Cool'
  },
  '真面目系': {
    ja: '真面目系',
    en: 'Serious'
  },
  'セクシー系': {
    ja: 'セクシー系',
    en: 'Sexy'
  },
  '天然系': {
    ja: '天然系',
    en: 'Airhead'
  },
  'ボーイッシュ系': {
    ja: 'ボーイッシュ系',
    en: 'Boyish'
  },
  'お姉さん系': {
    ja: 'お姉さん系',
    en: 'Big Sister'
  },
  'ツンデレ': {
    ja: 'ツンデレ',
    en: 'Tsundere'
  }
} as const;

export const PERSONALITY_TAGS = {
  // 基本性格
  '優しい': { ja: '優しい', en: 'Kind' },
  '明るい': { ja: '明るい', en: 'Cheerful' },
  'クール': { ja: 'クール', en: 'Cool' },
  '真面目': { ja: '真面目', en: 'Serious' },
  'おっとり': { ja: 'おっとり', en: 'Gentle' },
  '元気': { ja: '元気', en: 'Energetic' },
  'ツンデレ': { ja: 'ツンデレ', en: 'Tsundere' },
  '天然': { ja: '天然', en: 'Airhead' },
  
  // 特徴
  '甘えん坊': { ja: '甘えん坊', en: 'Affectionate' },
  '恥ずかしがり屋': { ja: '恥ずかしがり屋', en: 'Shy' },
  'ミステリアス': { ja: 'ミステリアス', en: 'Mysterious' },
  '世話好き': { ja: '世話好き', en: 'Caring' },
  'いたずら好き': { ja: 'いたずら好き', en: 'Mischievous' },
  '頑張り屋': { ja: '頑張り屋', en: 'Hardworking' },
  'のんびり': { ja: 'のんびり', en: 'Easygoing' },
  
  // 口調
  '敬語': { ja: '敬語', en: 'Polite' },
  'タメ口': { ja: 'タメ口', en: 'Casual' },
  '方言': { ja: '方言', en: 'Dialect' },
  'お嬢様口調': { ja: 'お嬢様口調', en: 'Ladylike' }
} as const;

export type PersonalityPreset = keyof typeof PERSONALITY_PRESETS;
export type PersonalityTag = keyof typeof PERSONALITY_TAGS;

// ヘルパー関数
export function getPersonalityPresetLabel(preset: PersonalityPreset, locale: 'ja' | 'en'): string {
  return PERSONALITY_PRESETS[preset]?.[locale] || preset;
}

export function getPersonalityTagLabel(tag: string, locale: 'ja' | 'en'): string {
  return PERSONALITY_TAGS[tag as PersonalityTag]?.[locale] || tag;
}