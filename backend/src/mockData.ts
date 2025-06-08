import { CharacterDocument, MockUser } from './types';

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

export const mockUser: MockUser = {
  id: 'mock-user-id',
  email: 'test@example.com',
  isActive: true,
  tokenBalance: 1000
};