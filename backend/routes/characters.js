const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { mockCharacters } = require('../mockData');

// モックモード判定
const USE_MOCK = process.env.USE_MOCK === 'true' || !process.env.MONGO_URI || process.env.MONGO_URI.includes('localhost:27017');

// GET /api/characters - キャラ一覧API（検索・ソート・ロケール対応）
router.get('/', auth, async (req, res) => {
  try {
    const { 
      locale = 'ja', 
      freeOnly = 'false', 
      sort = 'popular', 
      keyword = '' 
    } = req.query;

    let characters;

    if (USE_MOCK) {
      console.log('🎭 モックデータを使用してキャラクター一覧を返します');
      characters = mockCharacters.filter(char => char.isActive);
      
      // フィルタリング処理
      if (freeOnly === 'true') {
        characters = characters.filter(char => char.characterAccessType === 'free');
      }

      if (keyword) {
        const keywordLower = keyword.toLowerCase();
        characters = characters.filter(char => 
          char.name.ja.toLowerCase().includes(keywordLower) ||
          char.name.en.toLowerCase().includes(keywordLower) ||
          char.description.ja.toLowerCase().includes(keywordLower) ||
          char.description.en.toLowerCase().includes(keywordLower) ||
          char.personalityTags.some(tag => tag.toLowerCase().includes(keywordLower)) ||
          char.personalityPreset.toLowerCase().includes(keywordLower)
        );
      }

      // ソート処理
      switch (sort) {
        case 'popular':
          characters.sort((a, b) => (b.affinityStats?.totalUsers || 0) - (a.affinityStats?.totalUsers || 0));
          break;
        case 'newest':
          characters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case 'oldest':
          characters.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          break;
        case 'name':
          characters.sort((a, b) => (a.name[locale] || a.name.ja).localeCompare(b.name[locale] || b.name.ja));
          break;
        case 'affinity':
          characters.sort((a, b) => (b.affinityStats?.averageLevel || 0) - (a.affinityStats?.averageLevel || 0));
          break;
      }
    } else {
      // MongoDB を使用する場合の処理
      const Character = require('../models/Character');
      
      // 基本フィルター: アクティブなキャラクターのみ
      let filter = { isActive: true };

      // 無料キャラクターのみフィルター
      if (freeOnly === 'true') {
        filter.characterAccessType = 'free';
      }

      // キーワード検索フィルター
      if (keyword) {
        const keywordRegex = new RegExp(keyword, 'i');
        filter.$or = [
          { [`name.${locale}`]: keywordRegex },
          { [`name.ja`]: keywordRegex },
          { [`name.en`]: keywordRegex },
          { [`description.${locale}`]: keywordRegex },
          { [`description.ja`]: keywordRegex },
          { [`description.en`]: keywordRegex },
          { personalityTags: { $in: [keywordRegex] } },
          { personalityPreset: keywordRegex }
        ];
      }

      // ソート設定
      let sortOption = {};
      switch (sort) {
        case 'popular':
          sortOption = { 'affinityStats.totalUsers': -1, createdAt: -1 };
          break;
        case 'newest':
          sortOption = { createdAt: -1 };
          break;
        case 'oldest':
          sortOption = { createdAt: 1 };
          break;
        case 'name':
          sortOption = { [`name.${locale}`]: 1, [`name.ja`]: 1 };
          break;
        case 'affinity':
          sortOption = { 'affinityStats.averageLevel': -1, createdAt: -1 };
          break;
        default:
          sortOption = { createdAt: -1 };
      }

      characters = await Character.find(filter)
        .select('-adminPrompt')
        .sort(sortOption)
        .lean();
    }

    // ロケールに応じたレスポンス構築
    const localizedCharacters = characters.map(character => {
      // ローカライズされた名前と説明を構築
      const localizedName = character.name?.[locale] || character.name?.ja || character.name || '';
      const localizedDescription = character.description?.[locale] || character.description?.ja || character.description || '';
      const localizedDefaultMessage = character.defaultMessage?.[locale] || character.defaultMessage?.ja || '';

      return {
        _id: character._id,
        name: localizedName,
        description: localizedDescription,
        personalityPreset: character.personalityPreset,
        personalityTags: character.personalityTags || [],
        gender: character.gender,
        model: character.model,
        characterAccessType: character.characterAccessType,
        stripeProductId: character.stripeProductId,
        defaultMessage: localizedDefaultMessage,
        imageCharacterSelect: character.imageCharacterSelect,
        imageDashboard: character.imageDashboard,
        imageChatAvatar: character.imageChatAvatar,
        sampleVoiceUrl: character.sampleVoiceUrl,
        isActive: character.isActive,
        createdAt: character.createdAt,
        // 統計情報
        affinityStats: character.affinityStats || {
          totalUsers: 0,
          averageLevel: 0,
          maxLevelUsers: 0
        }
      };
    });

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

  } catch (error) {
    console.error('Characters list error:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      message: error.message 
    });
  }
});

module.exports = router;