import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { mockCharacters, mockUser } from './mockData';
import { CharacterDocument, MockUser } from './types';

dotenv.config({ path: './backend/.env' });

const app = express();
const PORT = process.env.PORT || 3002;
const USE_MOCK = process.env.USE_MOCK === 'true';

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
  const characters = mockCharacters.filter(char => char.isActive);
  
  // Query parameter handling with proper types
  const locale = (req.query.locale as string) || 'ja';
  const freeOnly = (req.query.freeOnly as string) || 'false';
  const sort = (req.query.sort as string) || 'popular';
  const keyword = (req.query.keyword as string) || '';
  
  let filteredCharacters: CharacterDocument[] = characters;
  
  // Filter by free only
  if (freeOnly === 'true') {
    filteredCharacters = filteredCharacters.filter(char => char.characterAccessType === 'free');
  }
  
  // Filter by keyword
  if (keyword) {
    const searchTerm = keyword.toLowerCase();
    filteredCharacters = filteredCharacters.filter(char => 
      char.name.ja.toLowerCase().includes(searchTerm) ||
      char.name.en.toLowerCase().includes(searchTerm) ||
      char.description.ja.toLowerCase().includes(searchTerm) ||
      char.description.en.toLowerCase().includes(searchTerm) ||
      (char.personalityTags && char.personalityTags.some(tag => tag.toLowerCase().includes(searchTerm))) ||
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
    personalityPreset: character.personalityPreset,
    personalityTags: character.personalityTags || [],
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
  res.json({
    characters: localizedCharacters,
    total: localizedCharacters.length,
    locale,
    filter: {
      freeOnly: freeOnly === 'true',
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

app.get('/api/ping', (_req: Request, res: Response): void => {
  res.send('pong');
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
