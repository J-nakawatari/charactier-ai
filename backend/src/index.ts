import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { mockCharacters, mockUser } from './mockData';

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

// Mock auth middleware
const mockAuth = (req: any, res: any, next: any) => {
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
app.get('/api/characters', mockAuth, (req, res) => {
  console.log('🎭 モックデータを使用してキャラクター一覧を返します');
  const characters = mockCharacters.filter(char => char.isActive);
  
  // Query parameter handling
  const { locale = 'ja', freeOnly = 'false', sort = 'popular', keyword = '' } = req.query;
  
  let filteredCharacters = characters;
  
  // Filter by free only
  if (freeOnly === 'true') {
    filteredCharacters = filteredCharacters.filter(char => char.characterAccessType === 'free');
  }
  
  // Filter by keyword
  if (keyword) {
    const searchTerm = keyword.toString().toLowerCase();
    filteredCharacters = filteredCharacters.filter(char => 
      char.name.ja.toLowerCase().includes(searchTerm) ||
      char.name.en.toLowerCase().includes(searchTerm) ||
      char.description.ja.toLowerCase().includes(searchTerm) ||
      char.description.en.toLowerCase().includes(searchTerm) ||
      char.personalityTags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      char.personalityPreset.toLowerCase().includes(searchTerm)
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
      filteredCharacters.sort((a, b) => (a.name[locale as string] || a.name.ja).localeCompare(b.name[locale as string] || b.name.ja));
      break;
    case 'affinity':
      filteredCharacters.sort((a, b) => (b.affinityStats?.averageLevel || 0) - (a.affinityStats?.averageLevel || 0));
      break;
  }
  
  // Localized response format
  const localizedCharacters = filteredCharacters.map(character => ({
    _id: character._id,
    name: character.name[locale as string] || character.name.ja,
    description: character.description[locale as string] || character.description.ja,
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

app.get('/api/characters/:id', mockAuth, (req, res) => {
  console.log(`🎭 モックデータから個別キャラクター取得: ID ${req.params.id}`);
  const character = mockCharacters.find(char => char._id === req.params.id);
  
  if (!character) {
    return res.status(404).json({ msg: 'キャラクターが見つかりません' });
  }
  if (!character.isActive) {
    return res.status(404).json({ msg: 'キャラクターが見つかりません' });
  }

  res.set('Cache-Control', 'no-store');
  res.json(character);
});

app.get('/api/ping', (_req, res) => {
  res.send('pong');
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
