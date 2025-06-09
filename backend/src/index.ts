import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { mockCharacters, mockCharacterTranslations, mockUser } from './mockData';
import { CharacterDocument, MockUser } from './types';

dotenv.config({ path: './backend/.env' });

const app = express();
const PORT = process.env.PORT || 3002;
const USE_MOCK = true; // Force mock mode for development

console.log('🚀 USE_MOCK:', USE_MOCK);
console.log('🚀 PORT:', PORT);

// Middleware
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json());

// Extend Request interface
declare module 'express-serve-static-core' {
  interface Request {
    user?: MockUser;
  }
}

// Mock auth middleware
const mockAuth = (req: Request, res: Response, next: NextFunction) => {
  if (USE_MOCK) {
    console.log('🎭 モックモード: 認証をスキップして仮ユーザーを設定');
    req.user = mockUser;
    return next();
  }
  // TODO: 実際の認証ロジックを実装
  req.user = mockUser;
  next();
};

// Characters API (using mock data from TypeScript)
app.get('/api/characters', mockAuth, (req: Request, res: Response): void => {
  console.log('🎭 モックデータを使用してキャラクター一覧を返します');
  
  // Query parameter handling with proper types
  const locale = (req.query.locale as string) || 'ja';
  const characterType = (req.query.characterType as string) || 'all';
  const sort = (req.query.sort as string) || 'popular';
  const keyword = (req.query.keyword as string) || '';
  
  // Combine Character with CharacterTranslation data
  const charactersWithTranslations = mockCharacters
    .filter(char => char.isActive)
    .map(character => {
      const translation = mockCharacterTranslations.find(t => t.characterId === character._id);
      if (!translation) {
        return character; // Fallback to original data if no translation
      }
      
      return {
        ...character,
        // Override with translation data for compatibility
        personalityPreset: (locale as 'ja' | 'en') === 'ja' ? translation.personalityPreset.ja : translation.personalityPreset.en,
        personalityTags: (locale as 'ja' | 'en') === 'ja' ? translation.personalityTags.ja : translation.personalityTags.en,
        // Keep original structure for name/description (they're already LocalizedString)
        translationData: translation // Store full translation for later use
      };
    });
  
  let filteredCharacters = [...charactersWithTranslations];
  
  // Filter by character type
  console.log('🔍 フィルター前のキャラクター数:', filteredCharacters.length);
  console.log('🔍 選択されたフィルター:', characterType);
  
  if (characterType === 'initial') {
    filteredCharacters = filteredCharacters.filter(char => char.characterAccessType === 'initial');
  } else if (characterType === 'purchased') {
    // モック環境では全てのプレミアムキャラを購入済みとして扱う
    filteredCharacters = filteredCharacters.filter(char => char.characterAccessType === 'premium');
  } else if (characterType === 'unpurchased') {
    // モック環境では購入が必要なキャラはないため空配列
    filteredCharacters = [];
  }
  
  console.log('🔍 フィルター後のキャラクター数:', filteredCharacters.length);
  
  // Filter by keyword
  if (keyword) {
    const searchTerm = keyword.toLowerCase();
    filteredCharacters = filteredCharacters.filter(char => 
      char.name.ja.toLowerCase().includes(searchTerm) ||
      char.name.en.toLowerCase().includes(searchTerm) ||
      char.description.ja.toLowerCase().includes(searchTerm) ||
      char.description.en.toLowerCase().includes(searchTerm) ||
      (char.personalityTags && char.personalityTags.some((tag: string) => tag.toLowerCase().includes(searchTerm))) ||
      (char.personalityPreset && char.personalityPreset.toLowerCase().includes(searchTerm))
    );
  }
  
  // Sort handling
  switch (sort) {
    case 'popular':
      filteredCharacters.sort((a, b) => (b.affinityStats?.totalUsers || 0) - (a.affinityStats?.totalUsers || 0));
      break;
    case 'newest':
      filteredCharacters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'oldest':
      filteredCharacters.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    case 'name':
      filteredCharacters.sort((a, b) => {
        const aName = (locale as 'ja' | 'en') === 'ja' ? a.name.ja : a.name.en;
        const bName = (locale as 'ja' | 'en') === 'ja' ? b.name.ja : b.name.en;
        return aName.localeCompare(bName);
      });
      break;
    case 'affinity':
      filteredCharacters.sort((a, b) => (b.affinityStats?.averageLevel || 0) - (a.affinityStats?.averageLevel || 0));
      break;
  }
  
  // Localized response format
  const localizedCharacters = filteredCharacters.map(character => ({
    _id: character._id,
    name: (locale as 'ja' | 'en') === 'ja' ? character.name.ja : character.name.en,
    description: (locale as 'ja' | 'en') === 'ja' ? character.description.ja : character.description.en,
    personalityPreset: character.personalityPreset, // Already localized
    personalityTags: character.personalityTags, // Already localized
    gender: character.gender,
    model: character.model,
    characterAccessType: character.characterAccessType,
    stripeProductId: character.stripeProductId,
    imageCharacterSelect: character.imageCharacterSelect,
    isActive: character.isActive,
    createdAt: character.createdAt,
    affinityStats: character.affinityStats || {
      totalUsers: 0,
      averageLevel: 0,
      maxLevelUsers: 0
    }
  }));
  
  res.set('Cache-Control', 'no-store');
  console.log('🔍 最終レスポンス:', {
    characterCount: localizedCharacters.length,
    characterNames: localizedCharacters.map(c => c.name),
    filter: { characterType, keyword, sort }
  });
  
  res.json({
    characters: localizedCharacters,
    total: localizedCharacters.length,
    locale,
    filter: {
      characterType,
      keyword,
      sort
    }
  });
});

app.get('/api/characters/:id', mockAuth, (req: Request, res: Response): void => {
  console.log(`🎭 モックデータから個別キャラクター取得: ID ${req.params.id}`);
  const character = mockCharacters.find(char => char._id === req.params.id);
  
  if (!character) {
    res.status(404).json({ msg: 'キャラクターが見つかりません' });
    return;
  }
  if (!character.isActive) {
    res.status(404).json({ msg: 'キャラクターが見つかりません' });
    return;
  }

  res.set('Cache-Control', 'no-store');
  res.json(character);
});

// Character translations management API
app.put('/api/characters/:id/translations', mockAuth, (req: Request, res: Response): void => {
  console.log(`📝 キャラクター翻訳更新: ID ${req.params.id}`);
  const characterId = req.params.id;
  const translations = req.body;
  
  // Validate character exists
  const character = mockCharacters.find(char => char._id === characterId);
  if (!character) {
    res.status(404).json({ msg: 'キャラクターが見つかりません' });
    return;
  }
  
  // Validate translation data structure
  if (!translations || typeof translations !== 'object') {
    res.status(400).json({ msg: '翻訳データが無効です' });
    return;
  }
  
  const { name, description, personalityPreset, personalityTags } = translations;
  
  // Validate required fields
  if (!name || !description || !personalityPreset || !personalityTags) {
    res.status(400).json({ msg: '必須フィールドが不足しています' });
    return;
  }
  
  // Validate language structure
  const requiredLangs = ['ja', 'en'];
  for (const field of ['name', 'description', 'personalityPreset']) {
    for (const lang of requiredLangs) {
      if (!translations[field] || typeof translations[field][lang] !== 'string') {
        res.status(400).json({ msg: `${field}.${lang} フィールドが無効です` });
        return;
      }
    }
  }
  
  // Validate personality tags
  for (const lang of requiredLangs) {
    if (!Array.isArray(translations.personalityTags[lang])) {
      res.status(400).json({ msg: `personalityTags.${lang} は配列である必要があります` });
      return;
    }
  }
  
  // TODO: In real implementation, save to MongoDB CharacterTranslation collection
  // For now, update mock data in memory (development only)
  const characterIndex = mockCharacters.findIndex(char => char._id === characterId);
  if (characterIndex !== -1) {
    mockCharacters[characterIndex] = {
      ...mockCharacters[characterIndex],
      name: translations.name,
      description: translations.description,
      personalityPreset: translations.personalityPreset.ja, // Primary language for now
      personalityTags: translations.personalityTags.ja, // Primary language for now
      // Store full translation data in a new field for future use
      translations: translations
    };
  }
  
  console.log('✅ 翻訳データを更新しました:', {
    characterId,
    hasTranslations: {
      name: !!translations.name,
      description: !!translations.description,
      personalityPreset: !!translations.personalityPreset,
      personalityTags: !!translations.personalityTags
    }
  });
  
  res.json({ 
    success: true, 
    message: '翻訳データが正常に保存されました',
    characterId,
    updatedAt: new Date().toISOString()
  });
});

app.get('/api/characters/:id/translations', mockAuth, (req: Request, res: Response): void => {
  console.log(`📖 キャラクター翻訳取得: ID ${req.params.id}`);
  const character = mockCharacters.find(char => char._id === req.params.id);
  
  if (!character) {
    res.status(404).json({ msg: 'キャラクターが見つかりません' });
    return;
  }
  
  // Return translation data if exists, otherwise return default structure
  const translations = (character as any).translations || {
    name: character.name,
    description: character.description,
    personalityPreset: { 
      ja: character.personalityPreset || '', 
      en: '' 
    },
    personalityTags: { 
      ja: character.personalityTags || [], 
      en: [] 
    }
  };
  
  res.json(translations);
});

// User API endpoints
app.get('/api/auth/user', mockAuth, (req: Request, res: Response): void => {
  console.log('👤 ユーザー情報取得');
  if (!req.user) {
    res.status(401).json({ msg: 'Unauthorized' });
    return;
  }
  
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    tokenBalance: req.user.tokenBalance,
    selectedCharacter: req.user.selectedCharacter
  });
});

app.patch('/api/users/me/use-character', mockAuth, (req: Request, res: Response): void => {
  console.log('🔄 selectedCharacter更新:', req.body);
  const { characterId } = req.body;
  
  if (!req.user) {
    res.status(401).json({ msg: 'Unauthorized' });
    return;
  }
  
  if (!characterId) {
    res.status(400).json({ msg: 'Character ID is required' });
    return;
  }
  
  // キャラクターが存在するかチェック
  const character = mockCharacters.find(char => char._id === characterId);
  if (!character || !character.isActive) {
    res.status(404).json({ msg: 'Character not found' });
    return;
  }
  
  // モックユーザーのselectedCharacterを更新
  mockUser.selectedCharacter = {
    _id: characterId,
    name: character.name
  };
  
  console.log('✅ selectedCharacter updated:', characterId, character.name);
  
  res.json({
    _id: mockUser._id,
    name: mockUser.name,
    email: mockUser.email,
    tokenBalance: mockUser.tokenBalance,
    selectedCharacter: mockUser.selectedCharacter
  });
});

app.get('/api/ping', (_req: Request, res: Response): void => {
  res.send('pong');
});

// Dashboard API route
app.get('/api/user/dashboard', mockAuth, (req: Request, res: Response): void => {
  console.log('📊 Dashboard API called (mock implementation)');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Mock dashboard data structure
  const mockDashboardData = {
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      createdAt: new Date('2024-01-15T10:30:00Z'),
      lastLoginAt: new Date()
    },
    tokens: {
      balance: req.user.tokenBalance,
      totalPurchased: 15000,
      totalUsed: 15000 - req.user.tokenBalance,
      recentUsage: [
        { date: "2025-01-09", amount: 450 },
        { date: "2025-01-08", amount: 320 },
        { date: "2025-01-07", amount: 180 },
        { date: "2025-01-06", amount: 290 },
        { date: "2025-01-05", amount: 410 },
        { date: "2025-01-04", amount: 220 },
        { date: "2025-01-03", amount: 380 }
      ]
    },
    affinities: mockCharacters.slice(0, 3).map((char, index) => ({
      character: {
        _id: char._id,
        name: char.name,
        imageCharacterSelect: char.imageCharacterSelect || `/characters/${char._id}.png`,
        themeColor: ['#E91E63', '#9C27B0', '#2196F3'][index]
      },
      level: [23, 15, 8][index],
      experience: [1250, 890, 420][index],
      experienceToNext: [150, 110, 80][index],
      maxExperience: [1400, 1000, 500][index],
      unlockedImages: index === 0 ? ['/characters/luna/unlock_10.png', '/characters/luna/unlock_20.png'] : 
                      index === 1 ? ['/characters/miko/unlock_10.png'] : [],
      nextUnlockLevel: [30, 20, 10][index]
    })),
    recentChats: [
      {
        _id: 'chat_001',
        character: {
          _id: mockCharacters[0]._id,
          name: mockCharacters[0].name,
          imageCharacterSelect: mockCharacters[0].imageCharacterSelect || '/characters/luna.png'
        },
        lastMessage: 'また今度お話ししましょうね♪',
        lastMessageAt: new Date('2025-01-09T14:30:00Z'),
        messageCount: 45
      }
    ],
    purchaseHistory: [
      {
        type: 'token',
        amount: 5000,
        date: new Date('2025-01-05T10:15:00Z'),
        details: 'トークンパック: 5,000トークン'
      }
    ],
    loginHistory: [
      { date: new Date(), platform: 'web', ipAddress: '192.168.1.100' }
    ],
    notifications: [
      {
        _id: 'notif_001',
        title: { ja: '新年キャンペーン開始！', en: 'New Year Campaign Started!' },
        message: { ja: '1月31日まで全トークンパック20%オフ！', en: '20% off all token packs until January 31st!' },
        type: 'info',
        isRead: false,
        createdAt: new Date('2025-01-01T00:00:00Z')
      }
    ],
    badges: [
      {
        _id: 'badge_001',
        name: { ja: '初心者', en: 'Beginner' },
        description: { ja: '初回ログインを達成', en: 'Completed first login' },
        iconUrl: '/icon/badge_beginner.svg',
        isUnlocked: true,
        unlockedAt: new Date('2024-01-15T10:30:00Z'),
        progress: 1,
        maxProgress: 1
      }
    ],
    analytics: {
      chatCountPerDay: [
        { date: "2025-01-03", count: 5 },
        { date: "2025-01-04", count: 3 },
        { date: "2025-01-05", count: 8 },
        { date: "2025-01-06", count: 4 },
        { date: "2025-01-07", count: 6 },
        { date: "2025-01-08", count: 7 },
        { date: "2025-01-09", count: 9 }
      ],
      tokenUsagePerDay: [
        { date: "2025-01-03", amount: 380 },
        { date: "2025-01-04", amount: 220 },
        { date: "2025-01-05", amount: 410 },
        { date: "2025-01-06", amount: 290 },
        { date: "2025-01-07", amount: 180 },
        { date: "2025-01-08", amount: 320 },
        { date: "2025-01-09", amount: 450 }
      ],
      affinityProgress: [
        { characterName: 'ルナ', level: 23, color: '#E91E63' },
        { characterName: 'ミコ', level: 15, color: '#9C27B0' },
        { characterName: 'ゼン', level: 8, color: '#2196F3' }
      ]
    }
  };

  console.log('✅ Dashboard mock data compiled successfully');
  res.json(mockDashboardData);
});

// Token Analytics API
app.get('/api/analytics/tokens', mockAuth, (req: Request, res: Response): void => {
  console.log('📊 Token Analytics API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const range = (req.query.range as string) || 'month';
  
  // Generate mock data based on range
  const generateDailyUsage = (days: number) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().slice(0, 10),
        amount: Math.floor(Math.random() * 500) + 200,
        count: Math.floor(Math.random() * 15) + 5
      });
    }
    return data;
  };

  const generateWeeklyTrend = () => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      data.push({
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        amount: Math.floor(Math.random() * 3000) + 1500,
        efficiency: Math.floor(Math.random() * 30) + 40
      });
    }
    return data;
  };

  const generateMonthlyTrend = () => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthlyAmount = Math.floor(Math.random() * 8000) + 6000;
      data.push({
        month: `${month.getFullYear()}/${month.getMonth() + 1}`,
        amount: monthlyAmount,
        averageDaily: Math.floor(monthlyAmount / 30)
      });
    }
    return data;
  };

  const generateHourlyPattern = () => {
    const data = [];
    for (let hour = 0; hour < 24; hour++) {
      const baseAmount = hour >= 19 && hour <= 23 ? 200 : 
                       hour >= 12 && hour <= 18 ? 150 : 
                       hour >= 7 && hour <= 11 ? 100 : 50;
      data.push({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        amount: baseAmount + Math.floor(Math.random() * 100),
        sessions: Math.floor((baseAmount / 50) * (Math.random() * 2 + 1))
      });
    }
    return data;
  };

  const characterUsage = [
    { characterName: 'ルナ', amount: 4850, percentage: 45, color: '#E91E63' },
    { characterName: 'ミコ', amount: 3240, percentage: 30, color: '#9C27B0' },
    { characterName: 'ゼン', amount: 1620, percentage: 15, color: '#2196F3' },
    { characterName: 'アリス', amount: 1080, percentage: 10, color: '#4CAF50' }
  ];

  const efficiency = {
    tokensPerMessage: 23.4,
    averageSessionLength: 18.7,
    peakHour: '21:00',
    mostEfficientCharacter: 'ゼン'
  };

  const days = range === 'week' ? 7 : range === 'month' ? 30 : 90;

  const analyticsData = {
    dailyUsage: generateDailyUsage(days),
    weeklyTrend: generateWeeklyTrend(),
    monthlyTrend: generateMonthlyTrend(),
    characterUsage,
    hourlyPattern: generateHourlyPattern(),
    efficiency
  };

  console.log('✅ Token analytics data generated successfully');
  res.json(analyticsData);
});

// Chat Analytics API
app.get('/api/analytics/chats', mockAuth, (req: Request, res: Response): void => {
  console.log('📊 Chat Analytics API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const range = (req.query.range as string) || 'month';
  
  // Generate mock conversation statistics
  const conversationStats = {
    totalConversations: 124,
    averageLength: 17.3,
    longestStreak: 12,
    currentStreak: 5,
    totalMessages: 2148,
    averageDaily: 4.1
  };

  // Generate daily activity data
  const generateDailyActivity = (days: number) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().slice(0, 10),
        conversations: Math.floor(Math.random() * 8) + 2,
        messages: Math.floor(Math.random() * 40) + 10,
        duration: Math.floor(Math.random() * 60) + 15
      });
    }
    return data;
  };

  // Character interaction data
  const characterInteraction = [
    { 
      characterName: 'ルナ', 
      conversations: 45, 
      averageLength: 18.5, 
      emotionalState: 'happy',
      color: '#E91E63' 
    },
    { 
      characterName: 'ミコ', 
      conversations: 32, 
      averageLength: 15.2, 
      emotionalState: 'excited',
      color: '#9C27B0' 
    },
    { 
      characterName: 'ゼン', 
      conversations: 28, 
      averageLength: 22.1, 
      emotionalState: 'loving',
      color: '#2196F3' 
    },
    { 
      characterName: 'アリス', 
      conversations: 19, 
      averageLength: 12.8, 
      emotionalState: 'curious',
      color: '#4CAF50' 
    }
  ];

  // Generate time patterns
  const generateTimePatterns = () => {
    const data = [];
    for (let hour = 0; hour < 24; hour++) {
      const baseConv = hour >= 19 && hour <= 23 ? 8 : 
                      hour >= 12 && hour <= 18 ? 6 : 
                      hour >= 7 && hour <= 11 ? 4 : 2;
      data.push({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        conversations: baseConv + Math.floor(Math.random() * 3),
        averageLength: Math.floor(Math.random() * 10) + 15
      });
    }
    return data;
  };

  // Generate emotional journey
  const generateEmotionalJourney = (days: number) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().slice(0, 10),
        happiness: Math.floor(Math.random() * 30) + 70,
        excitement: Math.floor(Math.random() * 40) + 60,
        affection: Math.floor(Math.random() * 25) + 65
      });
    }
    return data;
  };

  // Generate streak history
  const generateStreakHistory = (days: number) => {
    const data = [];
    let currentStreakValue = 0;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const hasActivity = Math.random() > 0.2;
      
      if (hasActivity) {
        currentStreakValue++;
      } else {
        currentStreakValue = 0;
      }
      
      data.push({
        date: date.toISOString().slice(0, 10),
        streak: currentStreakValue,
        active: hasActivity
      });
    }
    return data;
  };

  // Conversation depth distribution
  const conversationDepth = [
    { range: '1-5メッセージ', count: 15, percentage: 25 },
    { range: '6-15メッセージ', count: 25, percentage: 42 },
    { range: '16-30メッセージ', count: 12, percentage: 20 },
    { range: '31+メッセージ', count: 8, percentage: 13 }
  ];

  const days = range === 'week' ? 7 : range === 'month' ? 30 : 90;

  const analyticsData = {
    conversationStats,
    dailyActivity: generateDailyActivity(days),
    characterInteraction,
    timePatterns: generateTimePatterns(),
    emotionalJourney: generateEmotionalJourney(days),
    streakHistory: generateStreakHistory(days),
    conversationDepth
  };

  console.log('✅ Chat analytics data generated successfully');
  res.json(analyticsData);
});

// Affinity Analytics API
app.get('/api/analytics/affinity', mockAuth, (req: Request, res: Response): void => {
  console.log('📊 Affinity Analytics API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const range = (req.query.range as string) || 'quarter';
  const character = (req.query.character as string) || 'all';
  
  // Mock character data
  const characters = [
    { name: 'ルナ', color: '#E91E63' },
    { name: 'ミコ', color: '#9C27B0' },
    { name: 'ゼン', color: '#2196F3' },
    { name: 'アリス', color: '#4CAF50' }
  ];

  // Character progress data
  const characterProgress = characters.map((char, index) => ({
    characterName: char.name,
    level: [67, 43, 28, 15][index],
    trustLevel: [85, 72, 45, 32][index],
    intimacyLevel: [78, 65, 38, 25][index],
    experience: [6700, 4300, 2800, 1500][index],
    relationshipType: ['close_friend', 'friend', 'acquaintance', 'stranger'][index],
    emotionalState: ['loving', 'happy', 'excited', 'curious'][index],
    color: char.color,
    firstInteraction: new Date(2024, index + 1, 15).toISOString(),
    lastInteraction: new Date().toISOString(),
    totalConversations: [156, 89, 67, 34][index],
    currentStreak: [8, 3, 1, 0][index],
    maxStreak: [15, 7, 5, 2][index]
  }));

  // Generate level progression over time
  const generateLevelProgression = (days: number) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const entry: any = { date: date.toISOString().slice(0, 10) };
      
      characters.forEach((char, index) => {
        const baseLevel = characterProgress[index].level;
        const variation = Math.floor(Math.random() * 5) - 2;
        entry[char.name] = Math.max(0, baseLevel - Math.floor(i / 3) + variation);
      });
      
      data.push(entry);
    }
    return data;
  };

  // Trust correlation data
  const trustCorrelation = characters.map(char => {
    const charProgress = characterProgress.find(cp => cp.characterName === char.name)!;
    return {
      trust: charProgress.trustLevel,
      intimacy: charProgress.intimacyLevel,
      level: charProgress.level,
      characterName: char.name
    };
  });

  // Memory timeline
  const memoryTimeline = [
    {
      date: '2025-01-05',
      event: 'ルナとの初めてのデート',
      characterName: 'ルナ',
      importance: 5,
      type: 'special'
    },
    {
      date: '2025-01-03',
      event: 'ミコへのプレゼント',
      characterName: 'ミコ',
      importance: 4,
      type: 'gift'
    },
    {
      date: '2024-12-25',
      event: 'ゼンとのクリスマス',
      characterName: 'ゼン',
      importance: 5,
      type: 'milestone'
    },
    {
      date: '2024-12-20',
      event: 'アリスとの深い会話',
      characterName: 'アリス',
      importance: 3,
      type: 'conversation'
    }
  ];

  // Gift history
  const giftHistory = [
    {
      date: '2025-01-03',
      characterName: 'ミコ',
      giftType: 'flower',
      giftName: 'バラの花束',
      value: 500,
      impact: 8
    },
    {
      date: '2024-12-24',
      characterName: 'ルナ',
      giftType: 'jewelry',
      giftName: 'ネックレス',
      value: 1200,
      impact: 12
    },
    {
      date: '2024-12-15',
      characterName: 'ゼン',
      giftType: 'book',
      giftName: '詩集',
      value: 300,
      impact: 6
    }
  ];

  // Emotional development
  const emotionalDevelopment = characters.map(char => ({
    character: char.name,
    happy: Math.floor(Math.random() * 30) + 70,
    excited: Math.floor(Math.random() * 25) + 65,
    loving: Math.floor(Math.random() * 35) + 60,
    shy: Math.floor(Math.random() * 20) + 40,
    curious: Math.floor(Math.random() * 30) + 50
  }));

  // Relationship milestones
  const relationshipMilestones = [
    {
      characterName: 'ルナ',
      milestone: '親友レベル到達',
      achievedAt: '2024-11-15',
      level: 50,
      description: 'ルナとの関係が親友レベルに到達しました'
    },
    {
      characterName: 'ミコ',
      milestone: '信頼関係確立',
      achievedAt: '2024-10-20',
      level: 30,
      description: 'ミコからの信頼を得ることができました'
    },
    {
      characterName: 'ゼン',
      milestone: '初回ロック解除',
      achievedAt: '2024-09-10',
      level: 10,
      description: 'ゼンの特別な画像をアンロックしました'
    }
  ];

  const days = range === 'month' ? 30 : range === 'quarter' ? 90 : 365;

  const analyticsData = {
    overallStats: {
      totalCharacters: characters.length,
      averageLevel: Math.floor(characterProgress.reduce((sum, char) => sum + char.level, 0) / characterProgress.length),
      highestLevel: Math.max(...characterProgress.map(char => char.level)),
      totalGiftsGiven: giftHistory.length,
      totalInteractionDays: 127,
      relationshipMilestones: relationshipMilestones.length
    },
    characterProgress: character === 'all' ? characterProgress : characterProgress.filter(cp => cp.characterName.toLowerCase().includes(character)),
    levelProgression: generateLevelProgression(days),
    trustCorrelation,
    memoryTimeline,
    giftHistory,
    emotionalDevelopment,
    relationshipMilestones
  };

  console.log('✅ Affinity analytics data generated successfully');
  res.json(analyticsData);
});

// Purchase History API
app.get('/api/user/purchase-history', mockAuth, (req: Request, res: Response): void => {
  console.log('🛒 Purchase History API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Generate mock purchase history data
  const mockPurchases = [
    {
      _id: 'purchase_001',
      type: 'token',
      amount: 5000,
      price: 1000,
      currency: 'JPY',
      status: 'completed',
      paymentMethod: 'Credit Card',
      date: new Date('2025-01-05T10:15:00Z'),
      details: 'トークンパック: 5,000トークン',
      description: '5,000トークンパック（ボーナス+500トークン）',
      transactionId: 'txn_1234567890',
      invoiceUrl: '/invoices/001'
    },
    {
      _id: 'purchase_002',
      type: 'character',
      amount: 1,
      price: 500,
      currency: 'JPY',
      status: 'completed',
      paymentMethod: 'Credit Card',
      date: new Date('2024-12-20T14:30:00Z'),
      details: 'キャラクター: ルナ',
      description: 'プレミアムキャラクター「ルナ」のアンロック',
      transactionId: 'txn_1234567891',
      invoiceUrl: '/invoices/002'
    },
    {
      _id: 'purchase_003',
      type: 'token',
      amount: 10000,
      price: 1800,
      currency: 'JPY',
      status: 'completed',
      paymentMethod: 'PayPal',
      date: new Date('2024-12-01T09:00:00Z'),
      details: 'トークンパック: 10,000トークン（ボーナス付き）',
      description: '10,000トークンパック（限定ボーナス+2000トークン）',
      transactionId: 'txn_1234567892',
      invoiceUrl: '/invoices/003'
    },
    {
      _id: 'purchase_004',
      type: 'character',
      amount: 1,
      price: 500,
      currency: 'JPY',
      status: 'completed',
      paymentMethod: 'Credit Card',
      date: new Date('2024-11-15T16:45:00Z'),
      details: 'キャラクター: ミコ',
      description: 'プレミアムキャラクター「ミコ」のアンロック',
      transactionId: 'txn_1234567893',
      invoiceUrl: '/invoices/004'
    },
    {
      _id: 'purchase_005',
      type: 'token',
      amount: 2500,
      price: 500,
      currency: 'JPY',
      status: 'completed',
      paymentMethod: 'Bank Transfer',
      date: new Date('2024-11-01T11:20:00Z'),
      details: 'トークンパック: 2,500トークン',
      description: '2,500トークンパック（スタンダード）',
      transactionId: 'txn_1234567894',
      invoiceUrl: '/invoices/005'
    },
    {
      _id: 'purchase_006',
      type: 'token',
      amount: 1000,
      price: 200,
      currency: 'JPY',
      status: 'refunded',
      paymentMethod: 'Credit Card',
      date: new Date('2024-10-20T08:30:00Z'),
      details: 'トークンパック: 1,000トークン（返金済み）',
      description: '1,000トークンパック - 返金処理完了',
      transactionId: 'txn_1234567895',
      invoiceUrl: '/invoices/006'
    }
  ];

  // Calculate summary statistics
  const completedPurchases = mockPurchases.filter(p => p.status === 'completed');
  const totalSpent = completedPurchases.reduce((sum, purchase) => sum + purchase.price, 0);
  
  const tokenPurchases = completedPurchases.filter(p => p.type === 'token');
  const characterPurchases = completedPurchases.filter(p => p.type === 'character');
  const subscriptionPurchases = completedPurchases.filter(p => p.type === 'subscription');

  const summary = {
    tokens: {
      count: tokenPurchases.length,
      amount: tokenPurchases.reduce((sum, p) => sum + p.price, 0)
    },
    characters: {
      count: characterPurchases.length,
      amount: characterPurchases.reduce((sum, p) => sum + p.price, 0)
    },
    subscriptions: {
      count: subscriptionPurchases.length,
      amount: subscriptionPurchases.reduce((sum, p) => sum + p.price, 0)
    }
  };

  const purchaseHistoryData = {
    purchases: mockPurchases,
    totalSpent,
    totalPurchases: mockPurchases.length,
    summary
  };

  console.log('✅ Purchase history data generated successfully');
  res.json(purchaseHistoryData);
});

app.get('/api/debug', (_req: Request, res: Response): void => {
  res.json({
    USE_MOCK: USE_MOCK,
    PORT: PORT,
    NODE_ENV: process.env.NODE_ENV,
    env_USE_MOCK: process.env.USE_MOCK
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
