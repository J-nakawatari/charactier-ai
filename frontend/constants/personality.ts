// 性格プリセットの定義（多言語対応）
export const PERSONALITY_PRESETS = [
  { 
    value: 'おっとり系', 
    label: { ja: 'おっとり系', en: 'Gentle' },
    description: { ja: 'おっとりとしていて、ゆったりとした話し方をする', en: 'Gentle and speaks in a relaxed manner' }
  },
  { 
    value: '元気系', 
    label: { ja: '元気系', en: 'Energetic' },
    description: { ja: '明るくて活発、エネルギッシュな性格', en: 'Bright, active, and energetic personality' }
  },
  { 
    value: 'クール系', 
    label: { ja: 'クール系', en: 'Cool' },
    description: { ja: 'クールで落ち着いている、知的な印象', en: 'Cool, calm, and intellectual impression' }
  },
  { 
    value: '真面目系', 
    label: { ja: '真面目系', en: 'Serious' },
    description: { ja: '真面目で責任感が強い、丁寧な性格', en: 'Serious, responsible, and polite personality' }
  },
  { 
    value: 'セクシー系', 
    label: { ja: 'セクシー系', en: 'Sexy' },
    description: { ja: '魅力的で大人の色気がある', en: 'Attractive with mature charm' }
  },
  { 
    value: '天然系', 
    label: { ja: '天然系', en: 'Natural' },
    description: { ja: '天然でちょっと抜けているところがある', en: 'Natural and a bit absent-minded' }
  },
  { 
    value: 'ボーイッシュ系', 
    label: { ja: 'ボーイッシュ系', en: 'Boyish' },
    description: { ja: 'ボーイッシュで活発、男の子っぽい性格', en: 'Boyish, active, and tomboyish personality' }
  },
  { 
    value: 'お姉さん系', 
    label: { ja: 'お姉さん系', en: 'Big Sister' },
    description: { ja: '包容力があり、面倒見が良い大人の女性', en: 'Caring and nurturing mature woman' }
  }
];

// 性格タグの定義（多言語対応）
export const PERSONALITY_TAGS = [
  { 
    value: '明るい', 
    label: { ja: '明るい', en: 'Bright' },
    description: { ja: '明るく前向きな雰囲気を持っている', en: 'Has a bright and positive atmosphere' }
  },
  { 
    value: 'よく笑う', 
    label: { ja: 'よく笑う', en: 'Cheerful' },
    description: { ja: 'よく笑い、楽しい雰囲気を作る', en: 'Laughs often and creates a fun atmosphere' }
  },
  { 
    value: '甘えん坊', 
    label: { ja: '甘えん坊', en: 'Affectionate' },
    description: { ja: '甘えるのが上手で、可愛らしい一面がある', en: 'Good at being affectionate with a cute side' }
  },
  { 
    value: '積極的', 
    label: { ja: '積極的', en: 'Proactive' },
    description: { ja: '積極的で行動力がある', en: 'Proactive with strong initiative' }
  },
  { 
    value: '大人っぽい', 
    label: { ja: '大人っぽい', en: 'Mature' },
    description: { ja: '大人っぽい落ち着きがある', en: 'Has mature composure' }
  },
  { 
    value: '静か', 
    label: { ja: '静か', en: 'Quiet' },
    description: { ja: '静かで落ち着いている', en: 'Quiet and calm' }
  },
  { 
    value: '天然', 
    label: { ja: '天然', en: 'Natural' },
    description: { ja: '天然で純粋な一面がある', en: 'Has a natural and pure side' }
  },
  { 
    value: 'ボーイッシュ', 
    label: { ja: 'ボーイッシュ', en: 'Boyish' },
    description: { ja: 'ボーイッシュで活発', en: 'Boyish and active' }
  },
  { 
    value: 'ポジティブ', 
    label: { ja: 'ポジティブ', en: 'Positive' },
    description: { ja: '常にポジティブで前向き', en: 'Always positive and forward-looking' }
  },
  { 
    value: 'やや毒舌', 
    label: { ja: 'やや毒舌', en: 'Slightly Sarcastic' },
    description: { ja: 'ちょっと毒舌だが愛嬌がある', en: 'A bit sarcastic but charming' }
  },
  { 
    value: '癒し系', 
    label: { ja: '癒し系', en: 'Healing' },
    description: { ja: '癒しの雰囲気を持っている', en: 'Has a healing atmosphere' }
  },
  { 
    value: '元気いっぱい', 
    label: { ja: '元気いっぱい', en: 'Full of Energy' },
    description: { ja: 'エネルギッシュで元気いっぱい', en: 'Energetic and full of life' }
  },
  { 
    value: '知的', 
    label: { ja: '知的', en: 'Intellectual' },
    description: { ja: '知的で頭が良い', en: 'Intellectual and smart' }
  },
  { 
    value: '優しい', 
    label: { ja: '優しい', en: 'Kind' },
    description: { ja: '優しくて思いやりがある', en: 'Kind and considerate' }
  },
  { 
    value: '人懐っこい', 
    label: { ja: '人懐っこい', en: 'Friendly' },
    description: { ja: '人懐っこくて親しみやすい', en: 'Friendly and approachable' }
  }
];

// アクセスタイプの定義（多言語対応）
export const ACCESS_TYPES = [
  { 
    value: 'free', 
    label: { ja: 'ベースキャラ', en: 'Base Character' },
    description: { ja: 'トークン消費で利用可能', en: 'Available with token consumption' }
  },
  { 
    value: 'purchaseOnly', 
    label: { ja: 'プレミアムキャラ', en: 'Premium Character' },
    description: { ja: '購入が必要なキャラクター', en: 'Character that requires purchase' }
  }
];

// 性別の定義（多言語対応）
export const GENDERS = [
  { value: 'female', label: { ja: '女性', en: 'Female' } },
  { value: 'male', label: { ja: '男性', en: 'Male' } },
  { value: 'other', label: { ja: 'その他', en: 'Other' } }
];

// ヘルパー関数：現在のロケールに基づいてラベルを取得
export function getLocalizedLabel(item: { label: { ja: string; en: string } }, locale: string): string {
  return locale === 'en' ? item.label.en : item.label.ja;
}

// ヘルパー関数：現在のロケールに基づいて説明を取得
export function getLocalizedDescription(item: { description: { ja: string; en: string } }, locale: string): string {
  return locale === 'en' ? item.description.en : item.description.ja;
}