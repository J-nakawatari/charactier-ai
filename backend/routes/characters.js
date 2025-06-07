const express = require('express');
const router = express.Router();
const auth = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/middleware/auth');
const Character = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/models/Character');

// GET /api/characters - キャラ一覧API（検索・ソート・ロケール対応）
router.get('/', auth, async (req, res) => {
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
        // 人気順（チャット数や統計データがある場合）
        sortOption = { 'affinityStats.totalUsers': -1, createdAt: -1 };
        break;
      case 'newest':
        // 新しい順
        sortOption = { createdAt: -1 };
        break;
      case 'oldest':
        // 古い順
        sortOption = { createdAt: 1 };
        break;
      case 'name':
        // 名前順（ロケールに応じて）
        sortOption = { [`name.${locale}`]: 1, [`name.ja`]: 1 };
        break;
      case 'affinity':
        // 親密度の高い順
        sortOption = { 'affinityStats.averageLevel': -1, createdAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    // adminPromptを除外してキャラクター一覧を取得
    const characters = await Character.find(filter)
      .select('-adminPrompt')
      .sort(sortOption)
      .lean();

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