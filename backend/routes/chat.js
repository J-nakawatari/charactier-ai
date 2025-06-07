const express = require('express');
const router = express.Router();
const auth = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/middleware/auth');
const Chat = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/models/Chat');
const Character = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/models/Character');
const User = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/models/User');

// GET /api/chats/:characterId - チャット履歴とキャラ状態取得API
router.get('/:characterId', auth, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { locale = 'ja' } = req.query;

    // ユーザーとキャラクターの存在確認
    const [user, character] = await Promise.all([
      User.findById(req.user.id),
      Character.findById(characterId).select('-adminPrompt')
    ]);

    if (!user) {
      return res.status(404).json({ 
        error: 'ユーザーが見つかりません',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!character || !character.isActive) {
      return res.status(404).json({ 
        error: 'キャラクターが見つかりません',
        code: 'CHARACTER_NOT_FOUND'
      });
    }

    // チャット履歴を取得
    let chat = await Chat.findOne({ 
      userId: req.user.id,
      characterId
    });

    // チャット履歴が存在しない場合は空のチャットを作成
    if (!chat) {
      chat = new Chat({
        userId: req.user.id,
        characterId,
        messages: []
      });
      await chat.save();
    }

    // ユーザーの親密度情報を取得
    const affinity = user.affinities?.find(
      a => a.character.toString() === characterId.toString()
    );

    // キャラクターのローカライズされた情報を構築
    const localizedCharacter = {
      _id: character._id,
      name: character.name?.[locale] || character.name?.ja || character.name || '',
      description: character.description?.[locale] || character.description?.ja || character.description || '',
      personalityPreset: character.personalityPreset,
      personalityTags: character.personalityTags || [],
      gender: character.gender,
      model: character.model,
      characterAccessType: character.characterAccessType,
      defaultMessage: character.defaultMessage?.[locale] || character.defaultMessage?.ja || '',
      limitMessage: character.limitMessage?.[locale] || character.limitMessage?.ja || '',
      imageCharacterSelect: character.imageCharacterSelect,
      imageDashboard: character.imageDashboard,
      imageChatBackground: character.imageChatBackground,
      imageChatAvatar: character.imageChatAvatar,
      sampleVoiceUrl: character.sampleVoiceUrl,
      themeColor: character.themeColor
    };

    // ギャラリー画像の親密度別フィルタリング
    const currentAffinityLevel = affinity ? affinity.level : 0;
    const unlockedGalleryImages = character.galleryImages?.filter(
      img => img.unlockLevel <= currentAffinityLevel
    ) || [];

    // レスポンス構築
    const response = {
      chat: {
        _id: chat._id,
        userId: chat.userId,
        characterId: chat.characterId,
        messages: chat.messages || [],
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      },
      character: localizedCharacter,
      userState: {
        tokenBalance: user.tokenBalance || 0,
        selectedCharacter: user.selectedCharacter?.toString() === characterId ? characterId : null,
        affinity: {
          level: currentAffinityLevel,
          experience: affinity?.experience || 0,
          lastInteractedAt: affinity?.lastInteractedAt || null,
          streak: affinity?.lastVisitStreak || 0
        },
        unlockedGalleryImages,
        hasAccess: true // アクセス権限の判定（必要に応じて拡張）
      },
      metadata: {
        locale,
        totalMessages: chat.messages?.length || 0,
        lastMessageAt: chat.messages?.length > 0 ? 
          chat.messages[chat.messages.length - 1].timestamp : null
      }
    };

    res.set('Cache-Control', 'no-store');
    res.json(response);

  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ 
      error: 'チャット履歴の取得中にエラーが発生しました',
      message: error.message,
      code: 'CHAT_HISTORY_ERROR'
    });
  }
});

module.exports = router;