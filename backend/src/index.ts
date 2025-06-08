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

app.get('/api/ping', (_req: Request, res: Response): void => {
  res.send('pong');
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
