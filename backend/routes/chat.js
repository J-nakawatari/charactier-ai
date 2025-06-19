const express = require('express');
const router = express.Router();
const auth = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/middleware/auth');
const Chat = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/models/Chat');
const Character = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/models/Character');
const User = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/models/User');
const { ChatService } = require('../services/ChatService');
const { recordViolation, applySanction, checkChatPermission } = require('../utils/sanctionSystem');
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');

// 禁止用語リスト
const BLOCKED_WORDS = {
  japanese: [
    // 性的内容
    'エロ', 'えろ', '性的', 'セックス', 'セクス', 'AV', 'アダルト',
    // 暴力・自傷
    '殺', 'ころす', '殺す', '死ね', '自殺', '首吊り',
    // ヘイト・犯罪
    'ヘイト', '差別', '暴力', '犯す', 'レイプ', '援交',
    // 薬物・犯罪
    '麻薬', '覚醒剤', '大麻', '薬物', '爆弾', 'テロ',
    // 児童保護
    '児童', '小学生', '中学生', '未成年', 'ロリ', 'ショタ'
  ],
  english: [
    // 性的内容
    'sex', 'sexual', 'erotic', 'porn', 'adult', 'xxx', 'nude',
    // 暴力
    'kill', 'murder', 'suicide', 'die', 'death', 'violence',
    // ヘイト・犯罪
    'hate', 'racism', 'rape', 'assault', 'abuse',
    // 薬物・犯罪
    'drug', 'marijuana', 'cocaine', 'bomb', 'terror', 'weapon',
    // 児童保護
    'child', 'minor', 'loli', 'shota', 'underage', 'kid'
  ]
};

// OpenAI インスタンス
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ChatService インスタンス
const chatService = new ChatService();

// GET /api/chats/:characterId - チャット履歴とキャラ状態取得API
router.get('/:characterId', auth, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { locale = 'ja' } = req.query;

    // ユーザーとキャラクターの存在確認
    const [user, character] = await Promise.all([
      User.findById(req.user.id),
      Character.findById(characterId)
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

/**
 * 禁止用語チェック
 * @param {string} message - チェック対象メッセージ
 * @returns {Object} チェック結果
 */
function checkBlockedWords(message) {
  const normalizedMessage = message.toLowerCase();
  const allWords = [...BLOCKED_WORDS.japanese, ...BLOCKED_WORDS.english];
  
  for (let word of allWords) {
    if (normalizedMessage.includes(word.toLowerCase())) {
      return {
        isBlocked: true,
        detectedWord: word,
        reason: 'カスタム禁止用語検出'
      };
    }
  }
  
  return { isBlocked: false };
}

/**
 * OpenAI Moderation API チェック
 * @param {string} message - チェック対象メッセージ
 * @returns {Object} チェック結果
 */
async function checkOpenAIModeration(message) {
  try {
    const response = await openai.moderations.create({
      input: message
    });
    
    if (response.results[0].flagged) {
      return {
        isFlagged: true,
        categories: response.results[0].categories,
        reason: 'OpenAI Moderation API検出'
      };
    }
    
    return { isFlagged: false };
  } catch (error) {
    console.error('OpenAI Moderation API failed:', error);
    // フォールバック: OpenAI失敗時はカスタムチェック結果のみを使用
    return { isFlagged: false };
  }
}

/**
 * メッセージバリデーション（統合チェック）
 * @param {string} userId - ユーザーID
 * @param {string} message - チェック対象メッセージ
 * @param {Object} req - リクエストオブジェクト
 * @returns {Object} バリデーション結果
 */
async function validateMessage(userId, message, req) {
  try {
    // 1. 制裁状況チェック
    const permissionCheck = await checkChatPermission(userId);
    if (!permissionCheck.allowed) {
      return {
        allowed: false,
        reason: permissionCheck.reason,
        sanctionInfo: {
          type: permissionCheck.sanctionType,
          expiresAt: permissionCheck.expiresAt,
          violationCount: permissionCheck.violationCount
        }
      };
    }

    // 2. 禁止用語チェック
    const blockedCheck = checkBlockedWords(message);
    if (blockedCheck.isBlocked) {
      await recordViolation(userId, 'blocked_word', {
        detectedWord: blockedCheck.detectedWord,
        reason: blockedCheck.reason,
        messageContent: message,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      });
      
      await applySanction(userId);
      
      return {
        allowed: false,
        reason: 'メッセージに不適切な内容が含まれています',
        violationType: 'blocked_word',
        detectedWord: blockedCheck.detectedWord
      };
    }
    
    // 3. OpenAI Moderationチェック（フォールバック対応）
    const moderationCheck = await checkOpenAIModeration(message);
    if (moderationCheck.isFlagged) {
      await recordViolation(userId, 'openai_moderation', {
        reason: moderationCheck.reason,
        messageContent: message,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        moderationCategories: moderationCheck.categories
      });
      
      await applySanction(userId);
      
      return {
        allowed: false,
        reason: 'メッセージが利用規約に違反しています',
        violationType: 'openai_moderation',
        categories: moderationCheck.categories
      };
    }
    
    return { allowed: true };
    
  } catch (error) {
    console.error('Content moderation failed:', error);
    // 緊急フォールバック: エラー時はメッセージを通す（UX断絶防止）
    return {
      allowed: true,
      warning: 'Moderation check failed - message allowed by fallback'
    };
  }
}

// POST /api/chats/:characterId/messages - メッセージ送信API
router.post('/:characterId/messages', auth, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { message, sessionId } = req.body;
    const userId = req.user.id;

    // 入力バリデーション
    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'メッセージが空です',
        code: 'EMPTY_MESSAGE'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        error: 'メッセージが長すぎます（2000文字以内）',
        code: 'MESSAGE_TOO_LONG'
      });
    }

    // ユーザーとキャラクターの存在確認
    const [user, character] = await Promise.all([
      User.findById(userId),
      Character.findById(characterId)
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

    // 🔥 禁止用語フィルタリング（メッセージ処理前に実行）
    const validation = await validateMessage(userId, message.trim(), req);
    if (!validation.allowed) {
      return res.status(403).json({
        error: validation.reason,
        code: 'CONTENT_VIOLATION',
        violationType: validation.violationType,
        detectedWord: validation.detectedWord,
        sanctionInfo: validation.sanctionInfo
      });
    }

    // トークン残高確認
    if (user.tokenBalance <= 0) {
      return res.status(402).json({
        error: 'トークンが不足しています',
        code: 'INSUFFICIENT_TOKENS'
      });
    }

    // チャット履歴取得または作成
    let chat = await Chat.findOne({
      userId,
      characterId
    });

    if (!chat) {
      chat = new Chat({
        userId,
        characterId,
        messages: []
      });
    }

    // セッションID生成
    const currentSessionId = sessionId || uuidv4();

    // AI応答生成（ChatServiceを使用）
    const aiResponse = await chatService.generateCharacterResponse(
      userId,
      characterId,
      message.trim(),
      currentSessionId
    );

    // メッセージをチャット履歴に追加
    const timestamp = new Date();
    const userMessage = {
      id: uuidv4(),
      type: 'user',
      content: message.trim(),
      timestamp,
      sessionId: currentSessionId
    };

    const aiMessage = {
      id: uuidv4(),
      type: 'character',
      content: aiResponse.response,
      timestamp: new Date(),
      sessionId: currentSessionId,
      metadata: {
        tokensUsed: aiResponse.tokensUsed,
        apiCost: aiResponse.apiCost,
        intimacyChange: aiResponse.intimacyChange,
        toneStyle: aiResponse.toneStyle,
        relationshipStatus: aiResponse.relationshipStatus
      }
    };

    chat.messages.push(userMessage, aiMessage);
    chat.lastMessageAt = timestamp;
    chat.totalMessages = chat.messages.length;

    // ユーザーのトークン残高を減らす
    user.tokenBalance = Math.max(0, user.tokenBalance - aiResponse.tokensUsed);

    // TokenUsageに記録を保存（管理画面の統計用）
    const TokenUsage = require('../models/TokenUsage');
    const tokenUsageRecord = new TokenUsage({
      userId: user._id,
      characterId: character._id,
      tokensUsed: aiResponse.tokensUsed,
      tokenType: 'chat_message',
      inputTokens: aiResponse.inputTokens || Math.floor(aiResponse.tokensUsed * 0.3),
      outputTokens: aiResponse.outputTokens || Math.floor(aiResponse.tokensUsed * 0.7),
      apiCost: aiResponse.apiCost || 0.001,
      apiCostYen: (aiResponse.apiCost || 0.001) * 150,
      aiModel: 'gpt-4-turbo', // 固定値で試す
      sessionId: currentSessionId,
      messageContent: message.substring(0, 200), // 最初の200文字のみ保存
      responseContent: aiResponse.response.substring(0, 500) // AI応答の最初の500文字
    });

    // データベース保存
    try {
      await Promise.all([
        chat.save(),
        user.save(),
        tokenUsageRecord.save()
      ]);
    } catch (saveError) {
      console.error('TokenUsage save error:', saveError);
      // エラーが発生してもチャット自体は継続（ログのみ）
      await Promise.all([
        chat.save(),
        user.save()
      ]);
    }

    // 成功レスポンス
    res.json({
      success: true,
      messages: [userMessage, aiMessage],
      userMessage,
      aiMessage,
      metadata: {
        tokensUsed: aiResponse.tokensUsed,
        tokensRemaining: user.tokenBalance,
        intimacyChange: aiResponse.intimacyChange,
        currentIntimacy: aiResponse.toneConfig?.debugInfo?.intimacyLevel || 0,
        relationshipStatus: aiResponse.relationshipStatus,
        toneStyle: aiResponse.toneStyle,
        sessionId: currentSessionId
      },
      moderationInfo: validation.warning ? {
        warning: validation.warning
      } : undefined
    });

  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({
      error: 'メッセージ送信中にエラーが発生しました',
      message: error.message,
      code: 'CHAT_MESSAGE_ERROR'
    });
  }
});

module.exports = router;