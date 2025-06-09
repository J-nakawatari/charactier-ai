const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../../middleware/auth');

// モデルのインポート
const User = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/models/User');
const UserTokenPack = require('../../models/UserTokenPack');
const TokenUsage = require('../../models/TokenUsage');
const Chat = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/models/Chat');
const Character = require('../../models/Character');
const Notification = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/models/Notification');

/**
 * GET /api/user/dashboard
 * ユーザーダッシュボード統合API
 * JWT認証必須
 */
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔍 Dashboard API called for user:', userId);

    // 1. ユーザー基本情報 + ログイン履歴（最新10件）
    const user = await User.findById(userId)
      .select('_id name email createdAt lastLoginDate loginHistory affinities purchaseHistory')
      .lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ログイン履歴を最新10件に制限
    const loginHistory = (user.loginHistory || []).slice(-10).reverse().map(entry => ({
      date: entry.date || entry.timestamp || new Date(),
      platform: entry.platform || 'web',
      ipAddress: entry.ipAddress || '192.168.1.1'
    }));

    // 2. トークン残高と統計
    const tokenPacks = await UserTokenPack.find({ userId }).lean();
    const balance = tokenPacks.reduce((acc, pack) => acc + (pack.tokensRemaining || 0), 0);
    const totalPurchased = tokenPacks.reduce((acc, pack) => acc + (pack.tokensPurchased || 0), 0);
    const totalUsed = totalPurchased - balance;

    // TokenUsage から直近30件のYen消費データを取得・整形
    const tokenUsageData = await TokenUsage.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .select('createdAt apiCostYen tokensUsed')
      .lean();

    // 日付ごとに集計してrecentUsageを作成
    const recentUsage = [];
    const usageByDate = {};
    
    tokenUsageData.forEach(usage => {
      const date = usage.createdAt.toISOString().slice(0, 10);
      if (!usageByDate[date]) {
        usageByDate[date] = 0;
      }
      usageByDate[date] += usage.apiCostYen || 0;
    });

    // 直近7日分のデータを作成
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      recentUsage.push({
        date: dateStr,
        amount: Math.round(usageByDate[dateStr] || 0)
      });
    }

    // 3. 親密度情報（themeColor含む）
    const affinities = [];
    if (user.affinities && user.affinities.length > 0) {
      for (const affinity of user.affinities) {
        try {
          const character = await Character.findById(affinity.character)
            .select('_id name imageCharacterSelect themeColor')
            .lean();
          
          if (character) {
            affinities.push({
              character: {
                _id: character._id,
                name: character.name || { ja: 'Unknown', en: 'Unknown' },
                imageCharacterSelect: character.imageCharacterSelect || '',
                themeColor: character.themeColor || '#6366f1'
              },
              level: affinity.level || 0,
              experience: affinity.experience || 0,
              experienceToNext: Math.max(0, (affinity.maxExperience || 100) - (affinity.experience || 0)),
              maxExperience: affinity.maxExperience || 100,
              unlockedImages: affinity.unlockedImages || [],
              nextUnlockLevel: Math.ceil((affinity.level || 0) / 10) * 10 + 10
            });
          }
        } catch (charError) {
          console.error('Character fetch error:', charError);
        }
      }
    }

    // 4. 最近のチャット（3件制限）
    const recentChatData = [];
    try {
      const recentChats = await Chat.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $sort: { updatedAt: -1 } },
        {
          $group: {
            _id: '$characterId',
            lastMessage: { $first: { $arrayElemAt: ['$messages.content', -1] } },
            lastMessageAt: { $first: '$updatedAt' },
            messageCount: { $first: { $size: '$messages' } }
          }
        },
        { $limit: 3 }
      ]);

      // キャラクター情報を取得
      const chatCharacterIds = recentChats.map(chat => chat._id);
      const chatCharacters = await Character.find({ _id: { $in: chatCharacterIds } })
        .select('_id name imageCharacterSelect')
        .lean();

      recentChats.forEach(chat => {
        const character = chatCharacters.find(c => c._id.toString() === chat._id.toString());
        if (character) {
          recentChatData.push({
            _id: chat._id,
            character: {
              _id: character._id,
              name: character.name || { ja: 'Unknown', en: 'Unknown' },
              imageCharacterSelect: character.imageCharacterSelect || ''
            },
            lastMessage: chat.lastMessage || 'メッセージなし',
            lastMessageAt: chat.lastMessageAt || new Date(),
            messageCount: chat.messageCount || 0
          });
        }
      });
    } catch (chatError) {
      console.error('Recent chats fetch error:', chatError);
    }

    // 5. 購入履歴（最新20件）
    const purchaseHistory = (user.purchaseHistory || []).slice(-20).reverse().map(purchase => ({
      type: purchase.type || 'token',
      amount: purchase.amount || 0,
      date: purchase.date || purchase.createdAt || new Date(),
      details: purchase.details || purchase.description || 'Purchase'
    }));

    // 6. お知らせ
    const notifications = [];
    try {
      const notificationData = await Notification.find({ 
        $or: [
          { userId: userId },
          { isGlobal: true }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

      notificationData.forEach(notif => {
        notifications.push({
          _id: notif._id,
          title: notif.title || { ja: 'お知らせ', en: 'Notification' },
          message: notif.message || { ja: 'メッセージ', en: 'Message' },
          type: notif.type || 'info',
          isRead: notif.isRead || false,
          createdAt: notif.createdAt || new Date()
        });
      });
    } catch (notifError) {
      console.error('Notifications fetch error:', notifError);
    }

    // 7. バッジ（ダミーデータ）
    const badges = [
      {
        _id: 'badge_001',
        name: { ja: '初心者', en: 'Beginner' },
        description: { ja: '初回ログインを達成', en: 'Completed first login' },
        iconUrl: '/icon/badge_beginner.svg',
        isUnlocked: true,
        unlockedAt: user.createdAt,
        progress: 1,
        maxProgress: 1
      },
      {
        _id: 'badge_002',
        name: { ja: 'チャットマスター', en: 'Chat Master' },
        description: { ja: '100回のチャットを達成', en: 'Completed 100 chats' },
        iconUrl: '/icon/badge_chat_master.svg',
        isUnlocked: false,
        progress: Math.min(recentChatData.reduce((sum, chat) => sum + chat.messageCount, 0), 100),
        maxProgress: 100
      }
    ];

    // 8. 統計データ（ダミー実装）
    const analytics = {
      chatCountPerDay: generateDummyChatData(7),
      tokenUsagePerDay: recentUsage,
      affinityProgress: affinities.map(a => ({
        characterName: a.character.name.ja || 'Unknown',
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
        lastLoginAt: user.lastLoginDate || user.createdAt
      },
      tokens: {
        balance,
        totalPurchased,
        totalUsed,
        recentUsage
      },
      affinities,
      recentChats: recentChatData,
      purchaseHistory,
      loginHistory,
      notifications,
      badges,
      analytics
    };

    console.log('✅ Dashboard data compiled successfully');
    res.json(response);

  } catch (error) {
    console.error('🚨 Dashboard API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// ダミーデータ生成関数
function generateDummyChatData(days) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().slice(0, 10),
      count: Math.floor(Math.random() * 10) + 1
    });
  }
  return data;
}

module.exports = router;