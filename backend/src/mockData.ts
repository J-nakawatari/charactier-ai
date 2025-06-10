import { CharacterDocument, CharacterTranslation, MockUser, TokenPack } from './types';

// Mock data for testing when MongoDB is not available
export const mockCharacters: CharacterDocument[] = [
  {
    _id: '1',
    name: { ja: 'ルナ', en: 'Luna' },
    description: { 
      ja: '明るく元気な女の子。いつも笑顔で、みんなを励ましてくれる優しい性格です。',
      en: 'A bright and energetic girl. Always smiling and encouraging everyone with her kind personality.'
    },
    characterAccessType: 'initial',
    model: 'gpt-3.5-turbo',
    gender: 'female',
    personalityPreset: '元気系',
    personalityTags: ['明るい', 'よく笑う', 'ポジティブ', '元気いっぱい'],
    themeColor: '#ff6b9d',
    imageCharacterSelect: '/characters/luna.png',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    affinityStats: {
      totalUsers: 150,
      averageLevel: 25,
      maxLevelUsers: 5
    },
    defaultMessage: {
      ja: 'こんにちは！私はルナだよ✨ 今日はどんなことをお話ししようかな？',
      en: 'Hello! I\'m Luna✨ What would you like to talk about today?'
    }
  },
  {
    _id: '2',
    name: { ja: 'ミコ', en: 'Miko' },
    description: { 
      ja: '落ち着いた知的な女性。読書が好きで、深い話題について語り合うのを好みます。',
      en: 'A calm and intellectual woman. She loves reading and enjoys discussing deep topics.'
    },
    characterAccessType: 'initial',
    model: 'gpt-4',
    gender: 'female',
    personalityPreset: '知的系',
    personalityTags: ['知的', '静か', '大人っぽい', '優しい'],
    themeColor: '#8b5cf6',
    imageCharacterSelect: '/characters/miko.png',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    affinityStats: {
      totalUsers: 89,
      averageLevel: 42,
      maxLevelUsers: 3
    },
    defaultMessage: {
      ja: 'こんにちは。私はミコです。今日はどのようなお話をしましょうか？',
      en: 'Hello. I\'m Miko. What would you like to discuss today?'
    }
  },
  {
    _id: '3',
    name: { ja: 'ゼン', en: 'Zen' },
    description: { 
      ja: 'クールで冷静な男性。論理的思考が得意で、的確なアドバイスをくれます。',
      en: 'A cool and calm man. Good at logical thinking and gives accurate advice.'
    },
    characterAccessType: 'premium',
    model: 'gpt-4',
    gender: 'male',
    personalityPreset: 'クール系',
    personalityTags: ['静か', '知的', '大人っぽい'],
    price: 1500,
    themeColor: '#64748b',
    imageCharacterSelect: '/characters/zen.png',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    stripeProductId: 'prod_test_zen',
    affinityStats: {
      totalUsers: 67,
      averageLevel: 38,
      maxLevelUsers: 2
    },
    defaultMessage: {
      ja: 'こんにちは。僕はゼンだ。何について相談したいんだ？',
      en: 'Hello. I\'m Zen. What would you like to consult about?'
    }
  }
];

// CharacterTranslation mock data
export const mockCharacterTranslations: CharacterTranslation[] = [
  {
    characterId: '1',
    name: { ja: 'ルナ', en: 'Luna' },
    description: { 
      ja: '明るく元気な女の子。いつも笑顔で、みんなを励ましてくれる優しい性格です。',
      en: 'A bright and energetic girl. Always smiling and encouraging everyone with her kind personality.'
    },
    personalityPreset: { ja: '元気系', en: 'Energetic Type' },
    personalityTags: {
      ja: ['明るい', 'よく笑う', 'ポジティブ', '元気いっぱい'],
      en: ['Bright', 'Cheerful', 'Positive', 'Energetic']
    }
  },
  {
    characterId: '2',
    name: { ja: 'ミコ', en: 'Miko' },
    description: { 
      ja: '落ち着いた知的な女性。読書が好きで、深い話題について語り合うのを好みます。',
      en: 'A calm and intellectual woman. She loves reading and enjoys discussing deep topics.'
    },
    personalityPreset: { ja: '知的系', en: 'Intellectual Type' },
    personalityTags: {
      ja: ['知的', '静か', '大人っぽい', '優しい'],
      en: ['Intellectual', 'Calm', 'Mature', 'Kind']
    }
  },
  {
    characterId: '3',
    name: { ja: 'ゼン', en: 'Zen' },
    description: { 
      ja: 'クールで冷静な男性。論理的思考が得意で、的確なアドバイスをくれます。',
      en: 'A cool and calm man. Good at logical thinking and gives accurate advice.'
    },
    personalityPreset: { ja: 'クール系', en: 'Cool Type' },
    personalityTags: {
      ja: ['静か', '知的', '大人っぽい'],
      en: ['Quiet', 'Intellectual', 'Mature']
    }
  }
];

// Token Pack mock data based on existing TOKEN_PACKAGES
export const mockTokenPacks: TokenPack[] = [
  {
    _id: 'pack_001',
    name: 'スタンダードパック',
    description: '最もお得な基本パック。初回購入におすすめです。',
    tokens: 15000,
    price: 500,
    priceId: 'price_1RVCyQ1qmMqgQ3qQkRzWRIQU',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    profitMargin: 50.0, // 50%利益率
    tokenPerYen: 30.0 // 1円あたり30トークン
  },
  {
    _id: 'pack_002',
    name: 'バリューパック',
    description: '人気No.1！バランスの良いトークンパックです。',
    tokens: 35000,
    price: 1000,
    priceId: 'price_1RVCz01qmMqgQ3qQaZWU3IcA',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    profitMargin: 50.0, // 50%利益率
    tokenPerYen: 35.0 // 1円あたり35トークン
  },
  {
    _id: 'pack_003',
    name: 'プレミアムパック（旧）',
    description: '最高のコストパフォーマンス！たくさん話したい方におすすめ。',
    tokens: 110000,
    price: 3000,
    priceId: 'price_1RVENh1qmMqgQ3qQZnVRAgK4_old',
    isActive: false, // 無効化
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    profitMargin: 50.0, // 50%利益率
    tokenPerYen: 36.7 // 1円あたり約37トークン
  },
  {
    _id: 'pack_004',
    name: 'アルティメットパック',
    description: '最大容量のトークンパック。長期間安心してご利用いただけます。',
    tokens: 200000,
    price: 5000,
    priceId: 'price_1RVEPT1qmMqgQ3qQy3yrfq9V',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    profitMargin: 50.0, // 50%利益率
    tokenPerYen: 40.0 // 1円あたり40トークン
  },
  {
    _id: 'pack_005',
    name: '期間限定スペシャル',
    description: 'キャンペーン中のお得なパック！',
    tokens: 50000,
    price: 1200,
    priceId: 'price_special_campaign',
    isActive: false, // 非アクティブのテスト用
    createdAt: new Date('2024-06-01T00:00:00Z'),
    updatedAt: new Date('2024-06-01T00:00:00Z'),
    profitMargin: 50.0,
    tokenPerYen: 41.7
  }
];

export const mockUser: MockUser = {
  _id: 'mock-user-id',
  name: 'テストユーザー',
  email: 'test@example.com',
  isActive: true,
  tokenBalance: 1000,
  selectedCharacter: {
    _id: '3',
    name: { ja: 'ゼン', en: 'Zen' }
  }
};