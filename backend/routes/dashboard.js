const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const log = require('../src/utils/logger').default;

// ミドルウェア
const { authenticateToken } = require('../src/middleware/auth');

// モデル
const { UserModel } = require('../src/models/UserModel');
const Character = require('../models/Character');
const UserTokenPack = require('../models/UserTokenPack');
const TokenUsage = require('../models/TokenUsage');
const { ChatModel } = require('../src/models/ChatModel');
const { PurchaseHistoryModel } = require('../src/models/PurchaseHistoryModel');
const { BadgeModel } = require('../src/models/BadgeModel');
const { UserBadgeModel } = require('../src/models/UserBadgeModel');

/**
 * @route GET /api/user/dashboard
 * @desc ユーザーダッシュボードデータ取得
 * @access Private (JWT認証必須)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    log.info('Dashboard API called', { userId });

    // 1. ユーザー基本情報を取得（購入済みキャラクター含む）
    const user = await UserModel.findById(userId)
      .select('_id email name createdAt lastLogin affinities tokenBalance totalSpent selectedCharacter purchasedCharacters')
      .populate('purchasedCharacters', 'name')
      .lean();
    
    if (!user) {
      log.error('User not found', undefined, { userId });
      return res.status(404).json({ error: 'User not found' });
    }

    log.debug('User found', {
      userName: user.name,
      selectedCharacter: user.selectedCharacter,
      affinitiesCount: user.affinities?.length || 0
    });

    // 2. トークン残高と統計
    const tokenPacks = await UserTokenPack.find({ userId }).lean();
    const balance = tokenPacks.reduce((acc, pack) => acc + (pack.tokensRemaining || 0), 0);
    const totalPurchased = tokenPacks.reduce((acc, pack) => acc + (pack.tokensPurchased || 0), 0);
    const totalUsed = totalPurchased - balance;

    // 3. 最近のトークン使用履歴（直近30件）
    const recentTokenUsage = await TokenUsage.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    // 日付ごとにグループ化してrecentUsageを作成
    const usageByDate = {};
    recentTokenUsage.forEach(usage => {
      const date = new Date(usage.createdAt).toISOString().slice(0, 10);
      if (!usageByDate[date]) {
        usageByDate[date] = 0;
      }
      usageByDate[date] += usage.apiCostYen || 0;
    });

    const recentUsage = Object.entries(usageByDate)
      .slice(0, 7) // 最新7日分
      .map(([date, amount]) => ({ date, amount }));

    // 4. 親密度情報（Character.themeColor含む）
    console.log('🔍 Processing affinities:', user.affinities?.length || 0);
    
    // 5. チャット全体（親密度チェック用）
    const allChats = await ChatModel.find({ userId })
      .sort({ lastActivityAt: -1 })
      .lean();
    
    // 最近のチャット（表示用、5件制限）
    const recentChats = allChats.slice(0, 5);

    // 4.1. チャットしたキャラクターで親密度データがないものを自動追加
    const chatCharacterIds = [...new Set(allChats.map(chat => chat.characterId))];
    const existingAffinityCharacterIds = new Set((user.affinities || []).map(a => a.character.toString()));
    
    console.log('🔍 Chat character IDs:', chatCharacterIds);
    console.log('🔍 Existing affinity character IDs:', Array.from(existingAffinityCharacterIds));
    
    // 親密度データに含まれていないチャット相手を見つける
    const missingAffinityCharacterIds = chatCharacterIds.filter(charId => 
      !existingAffinityCharacterIds.has(charId.toString())
    );
    
    console.log('🔍 Missing affinity character IDs:', missingAffinityCharacterIds);
    
    // 不足している親密度データは自動追加しない（チャット時に作成）
    // missingAffinityCharacterIds があっても、強制的に親密度を作成しない
    
    const affinities = await Promise.all(
      (user.affinities || []).map(async affinity => {
        try {
          const character = await (Character.default || Character).findById(affinity.character)
            .select('_id name imageCharacterSelect imageChatAvatar themeColor')
            .lean();
          
          if (!character) {
            log.warn('Character not found for affinity', { characterId: affinity.character });
            return null;
          }
          
          return {
            character: {
              _id: character._id,
              name: character.name,
              imageCharacterSelect: character.imageCharacterSelect || character.imageChatAvatar,
              themeColor: character.themeColor || '#6366f1'
            },
            level: affinity.level || 0,
            experience: affinity.experience || 0,
            experienceToNext: (affinity.experienceToNext || 100) - (affinity.experience || 0),
            maxExperience: affinity.experienceToNext || 100,
            unlockedImages: affinity.unlockedRewards || [],
            nextUnlockLevel: Math.ceil((affinity.level || 0) / 10) * 10
          };
        } catch (error) {
          console.error('❌ Error processing affinity:', error);
          return null;
        }
      })
    );

    // 手動でキャラクター情報を取得
    const recentChatCharacterIds = [...new Set(recentChats.map(chat => chat.characterId))];
    const characters = await (Character.default || Character).find({
      _id: { $in: recentChatCharacterIds }
    }).select('_id name imageCharacterSelect').lean();
    
    const characterMap = new Map(characters.map(char => [char._id.toString(), char]));

    console.log('🔍 Recent chats raw data:', recentChats.length);
    if (recentChats.length > 0) {
      console.log('🔍 First chat characterId:', recentChats[0].characterId);
    }

    // チャットデータを整形
    const formattedRecentChats = recentChats.map(chat => {
      const lastMessage = chat.messages && chat.messages.length > 0 
        ? chat.messages[chat.messages.length - 1]
        : null;
      
      // characterMapからキャラクター情報を取得
      const characterData = characterMap.get(chat.characterId.toString());
      console.log('🔍 Character data for chat:', chat._id, characterData);
      
      return {
        _id: chat._id,
        character: {
          _id: characterData?._id || chat.characterId,
          name: characterData?.name || { ja: 'Unknown Character', en: 'Unknown Character' },
          imageCharacterSelect: characterData?.imageCharacterSelect || '/characters/default.png'
        },
        lastMessage: lastMessage ? lastMessage.content : 'チャットを開始しましょう',
        lastMessageAt: chat.lastActivityAt || chat.updatedAt,
        messageCount: chat.messages ? chat.messages.length : 0
      };
    });

    // 6. 購入履歴（実データ取得）
    const purchaseHistory = await PurchaseHistoryModel.getUserPurchaseHistory(
      user._id,
      { limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
    ).catch(error => {
      log.warn('Purchase history fetch failed', { error: error.message });
      return [];
    });

    // 7. ログイン履歴（実装未完了）
    const loginHistory = [];

    // 8. お知らせ（実装未完了）
    const notifications = [];

    // 9. バッジ（実装未完了）  
    // 8. バッジ情報（ユーザーの進捗含む）
    const allBadges = await BadgeModel.find({ isActive: true }).lean();
    const userBadges = await UserBadgeModel.find({ userId }).lean();
    
    const badges = allBadges.map(badge => {
      const userBadge = userBadges.find(ub => ub.badgeId.toString() === badge._id.toString());
      return {
        _id: badge._id,
        name: badge.name,
        description: badge.description,
        iconUrl: badge.iconUrl,
        isUnlocked: userBadge?.isUnlocked || false,
        progress: userBadge?.progress || 0,
        maxProgress: userBadge?.maxProgress || badge.condition.value,
        unlockedAt: userBadge?.unlockedAt || null
      };
    });

    // 10. 統計データ（実データ実装）
    // チャット統計（過去7日間）
    console.log('🔍 Starting chat analytics for user:', user._id);
    
    // Debug: Check all chats for this user
    const allUserChats = await ChatModel.find({ userId: user._id }).lean();
    console.log('🔍 Total chats for user:', allUserChats.length);
    
    if (allUserChats.length > 0) {
      console.log('🔍 First chat sample:', {
        _id: allUserChats[0]._id,
        characterId: allUserChats[0].characterId,
        lastActivityAt: allUserChats[0].lastActivityAt,
        messagesCount: allUserChats[0].messages?.length || 0
      });
    }
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    console.log('🔍 Seven days ago:', sevenDaysAgo);
    
    const recentUserChats = await ChatModel.find({
      userId: user._id,
      lastActivityAt: { $gte: sevenDaysAgo }
    }).lean();
    console.log('🔍 Recent chats (past 7 days):', recentUserChats.length);
    
    const chatStats = await ChatModel.aggregate([
      {
        $match: {
          userId: user._id.toString(), // Convert ObjectId to string
          lastActivityAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastActivityAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).catch((err) => {
      console.error('❌ Chat aggregation error:', err);
      return [];
    });
    
    console.log('🔍 Chat stats result:', chatStats);

    // トークン使用統計（過去7日間）
    const tokenStats = await TokenUsage.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalTokens: { $sum: "$tokensUsed" },
          totalCost: { $sum: "$apiCostYen" }
        }
      },
      { $sort: { _id: 1 } }
    ]).catch(() => []);

    console.log('🔍 Token stats result:', tokenStats);

    const analytics = {
      chatCountPerDay: chatStats.map(stat => ({
        date: stat._id,
        count: stat.count
      })),
      tokenUsagePerDay: tokenStats.map(stat => ({
        date: stat._id,
        amount: stat.totalTokens || 0,
        tokens: stat.totalTokens,
        cost: stat.totalCost
      })),
      affinityProgress: affinities.filter(a => a).map(a => ({
        characterName: a.character.name.ja || a.character.name,
        level: a.level,
        color: a.character.themeColor
      }))
    };

    console.log('🔍 Analytics chatCountPerDay:', analytics.chatCountPerDay);
    console.log('🔍 Analytics tokenUsagePerDay:', analytics.tokenUsagePerDay);
    console.log('🔍 Analytics affinityProgress:', analytics.affinityProgress);

    // レスポンス構築
    const response = {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLogin,
        selectedCharacter: user.selectedCharacter,
        purchasedCharacters: user.purchasedCharacters?.map((char) => ({
          id: char._id,
          name: typeof char === 'object' && char.name ? 
            (typeof char.name === 'object' ? (char.name.ja || char.name.en || 'Unknown') : char.name) : 
            'Unknown Character'
        })) || []
      },
      tokens: {
        balance,
        totalPurchased,
        totalUsed,
        recentUsage
      },
      affinities: affinities.filter(a => a),
      recentChats: formattedRecentChats,
      purchaseHistory,
      loginHistory,
      notifications,
      badges,
      analytics
    };

    console.log('✅ Dashboard data prepared:', {
      affinities: response.affinities.length,
      tokenBalance: response.tokens.balance,
      recentUsage: response.tokens.recentUsage.length
    });
    console.log('🔍 Dashboard response purchasedCharacters:', response.user.purchasedCharacters);

    res.json(response);

  } catch (error) {
    console.error('❌ Dashboard API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});


/**
 * @route GET /api/user/dashboard/debug-chats-simple
 * @desc チャットデータのデバッグ用エンドポイント (認証なし)
 * @access Public (開発用のみ)
 */
router.get('/debug-chats-simple', async (req, res) => {
  try {
    // 既知のユーザーIDを使用（designroommaster@gmail.com）
    const userId = '684b12fedcd9521713306082';
    console.log('🔍 Debug: userId:', userId);
    
    // 1. 全チャット数を確認
    const totalChats = await ChatModel.countDocuments({ userId });
    console.log('🔍 Total chats for user:', totalChats);
    
    // 2. 最近のチャットを取得
    const recentChats = await ChatModel.find({ userId })
      .sort({ lastActivityAt: -1 })
      .limit(5)
      .lean();
    
    console.log('🔍 Recent chats:', recentChats.length);
    
    if (recentChats.length > 0) {
      recentChats.forEach((chat, index) => {
        console.log(`🔍 Chat ${index + 1}:`, {
          _id: chat._id,
          characterId: chat.characterId,
          lastActivityAt: chat.lastActivityAt,
          messagesCount: chat.messages?.length || 0,
          totalTokensUsed: chat.totalTokensUsed
        });
      });
    }
    
    // 3. 過去7日間のチャット統計
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    console.log('🔍 Seven days ago:', sevenDaysAgo);
    
    const recentUserChats = await ChatModel.find({
      userId,
      lastActivityAt: { $gte: sevenDaysAgo }
    }).lean();
    
    console.log('🔍 Recent chats (past 7 days):', recentUserChats.length);
    
    // 4. 集計クエリのテスト
    const chatStats = await ChatModel.aggregate([
      {
        $match: {
          userId: userId,
          lastActivityAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastActivityAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('🔍 Chat stats aggregation result:', chatStats);
    
    res.json({
      userId,
      totalChats,
      recentChats: recentChats.length,
      recentChatsData: recentChats.map(chat => ({
        _id: chat._id,
        characterId: chat.characterId,
        lastActivityAt: chat.lastActivityAt,
        messagesCount: chat.messages?.length || 0
      })),
      sevenDaysAgo,
      recentChatsLast7Days: recentUserChats.length,
      chatStats
    });
    
  } catch (error) {
    console.error('❌ Debug chats error:', error);
    res.status(500).json({ 
      error: 'Debug error',
      message: error.message
    });
  }
});

/**
 * @route GET /api/user/dashboard/debug-chats
 * @desc チャットデータのデバッグ用エンドポイント
 * @access Private (JWT認証必須)
 */
router.get('/debug-chats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔍 Debug: userId:', userId);
    
    // 1. 全チャット数を確認
    const totalChats = await ChatModel.countDocuments({ userId });
    console.log('🔍 Total chats for user:', totalChats);
    
    // 2. 最近のチャットを取得
    const recentChats = await ChatModel.find({ userId })
      .sort({ lastActivityAt: -1 })
      .limit(5)
      .lean();
    
    console.log('🔍 Recent chats:', recentChats.length);
    
    if (recentChats.length > 0) {
      recentChats.forEach((chat, index) => {
        console.log(`🔍 Chat ${index + 1}:`, {
          _id: chat._id,
          characterId: chat.characterId,
          lastActivityAt: chat.lastActivityAt,
          messagesCount: chat.messages?.length || 0,
          totalTokensUsed: chat.totalTokensUsed
        });
      });
    }
    
    // 3. 過去7日間のチャット統計
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    console.log('🔍 Seven days ago:', sevenDaysAgo);
    
    const recentUserChats = await ChatModel.find({
      userId,
      lastActivityAt: { $gte: sevenDaysAgo }
    }).lean();
    
    console.log('🔍 Recent chats (past 7 days):', recentUserChats.length);
    
    // 4. 集計クエリのテスト
    const chatStats = await ChatModel.aggregate([
      {
        $match: {
          userId: userId,
          lastActivityAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastActivityAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('🔍 Chat stats aggregation result:', chatStats);
    
    res.json({
      userId,
      totalChats,
      recentChats: recentChats.length,
      recentChatsData: recentChats.map(chat => ({
        _id: chat._id,
        characterId: chat.characterId,
        lastActivityAt: chat.lastActivityAt,
        messagesCount: chat.messages?.length || 0
      })),
      sevenDaysAgo,
      recentChatsLast7Days: recentUserChats.length,
      chatStats
    });
    
  } catch (error) {
    console.error('❌ Debug chats error:', error);
    res.status(500).json({ 
      error: 'Debug error',
      message: error.message
    });
  }
});

module.exports = router;