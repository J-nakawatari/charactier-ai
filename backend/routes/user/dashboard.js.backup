const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const auth = require('../../middleware/auth');

// Dashboard rate limiting - 1つのIPから5分間に10回まで
const dashboardRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分
  max: 10, // 最大10リクエスト
  message: {
    error: 'Too many dashboard requests',
    message: 'ダッシュボードAPIへのアクセスが制限されています。5分後に再試行してください。'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// モデルのインポート
const { UserModel: User } = require('../../src/models/UserModel');
const UserTokenPack = require('../../models/UserTokenPack');
const TokenUsage = require('../../models/TokenUsage');
// const Chat = require('../../models/Chat'); // Chat model not found
const Character = require('../../models/Character');
// const Notification = require('../../models/Notification'); // Notification model not found

/**
 * GET /api/user/dashboard
 * ユーザーダッシュボード統合API
 * JWT認証必須
 */
router.get('/dashboard', dashboardRateLimit, auth, async (req, res) => {
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

    // 4. 最近のチャット（実装待ち）
    const recentChatData = [];

    // 5. 購入履歴（最新20件）
    const purchaseHistory = (user.purchaseHistory || []).slice(-20).reverse().map(purchase => ({
      type: purchase.type || 'token',
      amount: purchase.amount || 0,
      date: purchase.date || purchase.createdAt || new Date(),
      details: purchase.details || purchase.description || 'Purchase'
    }));

    // 6. お知らせ（実装待ち）
    const notifications = [];

    // 7. バッジ（実装待ち）
    const badges = [];

    // 8. 統計データ
    const analytics = {
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


module.exports = router;