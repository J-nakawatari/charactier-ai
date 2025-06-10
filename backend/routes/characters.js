const express = require('express');
const rateLimit = require('express-rate-limit');
const escapeStringRegexp = require('escape-string-regexp');
const router = express.Router();
const auth = require('../middleware/auth');
const { CharacterModel: Character } = require('../src/models/CharacterModel');

// Characters rate limiting - 1つのIPから1分間に60回まで
const charactersRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分
  max: 60, // 最大60リクエスト
  message: {
    error: 'Too many characters requests',
    message: 'キャラクターAPIへのアクセスが制限されています。1分後に再試行してください。'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/characters - キャラ一覧API（検索・ソート・ロケール対応）
router.get('/', charactersRateLimit, auth, async (req, res) => {
  try {
    const { 
      locale = 'ja', 
      freeOnly = 'false', 
      sort = 'popular', 
      keyword = '' 
    } = req.query;

    // 基本フィルター: アクティブなキャラクターのみ
    let filter = { isActive: true };

    // 無料キャラクターのみフィルター
    if (freeOnly === 'true') {
      filter.characterAccessType = 'free';
    }

    // キーワード検索フィルター（正規表現インジェクション対策）
    if (keyword) {
      const escapedKeyword = escapeStringRegexp(keyword);
      const keywordRegex = new RegExp(escapedKeyword, 'i');
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
        sortOption = { totalUsers: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'name':
        sortOption = { [`name.${locale}`]: 1 };
        break;
      case 'affinity':
        sortOption = { averageAffinityLevel: -1 };
        break;
      default:
        sortOption = { totalUsers: -1 };
    }

    // データベースクエリ実行
    const characters = await Character.find(filter)
      .select('name description imageCharacterSelect themeColor characterAccessType personalityPreset personalityTags totalUsers averageAffinityLevel createdAt')
      .sort(sortOption)
      .lean();

    console.log(`✅ ${characters.length}件のキャラクターを取得`);
    res.json({
      characters,
      total: characters.length,
      filters: { locale, freeOnly, sort, keyword }
    });

  } catch (error) {
    console.error('❌ Characters API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'キャラクター取得中にエラーが発生しました'
    });
  }
});

// GET /api/characters/:id - キャラクター詳細取得
router.get('/:id', charactersRateLimit, auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { locale = 'ja' } = req.query;

    const character = await Character.findById(id)
      .select('-__v')
      .lean();

    if (!character) {
      return res.status(404).json({
        error: 'Character not found',
        message: 'キャラクターが見つかりません'
      });
    }

    if (!character.isActive) {
      return res.status(404).json({
        error: 'Character not available',
        message: 'このキャラクターは利用できません'
      });
    }

    console.log(`✅ キャラクター詳細取得: ${character.name[locale] || character.name.ja}`);
    res.json({ character });

  } catch (error) {
    console.error('❌ Character detail API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'キャラクター詳細取得中にエラーが発生しました'
    });
  }
});

module.exports = router;