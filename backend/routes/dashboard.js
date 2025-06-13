const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ミドルウェア
const { authenticateToken } = require('../src/middleware/auth');

// モデル
const { UserModel } = require('../src/models/UserModel');
const Character = require('../models/Character');
const UserTokenPack = require('../models/UserTokenPack');
const TokenUsage = require('../models/TokenUsage');
const { ChatModel } = require('../src/models/ChatModel');
const { PurchaseHistoryModel } = require('../src/models/PurchaseHistoryModel');

/**
 * @route GET /api/user/dashboard
 * @desc ユーザーダッシュボードデータ取得
 * @access Private (JWT認証必須)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('📊 Dashboard API called for user:', userId);

    // 1. ユーザー基本情報を取得
    const user = await UserModel.findById(userId)
      .select('_id email name createdAt lastLogin affinities tokenBalance totalSpent selectedCharacter')
      .lean();
    
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ User found:', user.name);

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
    const affinities = await Promise.all(
      (user.affinities || []).map(async affinity => {
        try {
          const character = await (Character.default || Character).findById(affinity.character)
            .select('_id name imageCharacterSelect imageChatAvatar themeColor')
            .lean();
          
          if (!character) {
            console.warn('⚠️ Character not found for affinity:', affinity.character);
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

    // 5. 最近のチャット（実データ取得）
    const recentChats = await ChatModel.find({ userId })
      .sort({ lastActivityAt: -1 })
      .limit(5)
      .populate('characterId', '_id name imageCharacterSelect')
      .lean();

    // チャットデータを整形
    const formattedRecentChats = recentChats.map(chat => {
      const lastMessage = chat.messages && chat.messages.length > 0 
        ? chat.messages[chat.messages.length - 1]
        : null;
      
      return {
        _id: chat._id,
        character: {
          _id: chat.characterId._id,
          name: chat.characterId.name,
          imageCharacterSelect: chat.characterId.imageCharacterSelect
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
      console.warn('⚠️ Purchase history fetch failed:', error);
      return [];
    });

    // 7. ログイン履歴（実装未完了）
    const loginHistory = [];

    // 8. お知らせ（実装未完了）
    const notifications = [];

    // 9. バッジ（実装未完了）  
    const badges = [];

    // 10. 統計データ（実データ実装）
    // チャット統計（過去7日間）
    const chatStats = await ChatModel.aggregate([
      {
        $match: {
          userId: user._id,
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
    ]).catch(() => []);

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

    const analytics = {
      chatCountPerDay: chatStats.map(stat => ({
        date: stat._id,
        count: stat.count
      })),
      tokenUsagePerDay: tokenStats.map(stat => ({
        date: stat._id,
        tokens: stat.totalTokens,
        cost: stat.totalCost
      })),
      affinityProgress: affinities.filter(a => a).map(a => ({
        characterName: a.character.name.ja || a.character.name,
        level: a.level,
        color: a.character.themeColor
      }))
    };

    // レスポンス構築
    const response = {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLogin,
        selectedCharacter: user.selectedCharacter
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

    res.json(response);

  } catch (error) {
    console.error('❌ Dashboard API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});


module.exports = router;