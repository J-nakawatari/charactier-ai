#!/usr/bin/env node

/**
 * 🔍 トークン残高・統計データ不一致分析スクリプト
 * 
 * 目的: 管理画面でのトークン残高、総支払額、チャット数の不一致を調査
 */

const mongoose = require('mongoose');
require('dotenv').config();

// UserModelの定義
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  tokenBalance: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  totalChatMessages: { type: Number, default: 0 },
  accountStatus: { type: String, default: 'active' },
  isActive: { type: Boolean, default: true },
  affinities: [{
    character: mongoose.Schema.Types.ObjectId,
    level: Number
  }],
  createdAt: Date
});

const UserModel = mongoose.model('User', UserSchema);

// UserTokenPackの定義
const UserTokenPackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenPackId: { type: mongoose.Schema.Types.ObjectId, ref: 'TokenPack', required: true },
  tokens: { type: Number, required: true },
  usedTokens: { type: Number, default: 0 },
  remainingTokens: { type: Number, required: true },
  purchaseDate: { type: Date, default: Date.now },
  expiryDate: Date,
  isActive: { type: Boolean, default: true }
});

const UserTokenPackModel = mongoose.model('UserTokenPack', UserTokenPackSchema);

// PurchaseHistoryの定義
const PurchaseHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: String,
  status: { type: String, default: 'completed' },
  createdAt: { type: Date, default: Date.now }
});

const PurchaseHistoryModel = mongoose.model('PurchaseHistory', PurchaseHistorySchema);

// ChatModelの定義
const MessageSchema = new mongoose.Schema({
  _id: String,
  role: { type: String, enum: ['user', 'assistant'] },
  content: String,
  timestamp: { type: Date, default: Date.now },
  tokensUsed: { type: Number, default: 0 }
}, { _id: false });

const ChatSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character', required: true },
  messages: [MessageSchema],
  totalTokensUsed: { type: Number, default: 0 },
  currentAffinity: { type: Number, default: 0 },
  lastActivityAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ChatModel = mongoose.model('Chat', ChatSchema);

async function analyzeTokenDiscrepancy() {
  try {
    console.log('🔍 トークン残高・統計不一致分析開始...');
    
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('環境変数MONGO_URIが設定されていません');
    }
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ データベース接続成功');

    console.log('\n📊 ユーザー統計分析...');

    // 1. 全ユーザーのデータを取得
    const users = await UserModel.find({ isActive: { $ne: false } })
      .select('_id name email tokenBalance totalSpent totalChatMessages accountStatus')
      .lean();

    console.log(`👥 総ユーザー数: ${users.length}人`);

    // 2. 各ユーザーのトークン残高を詳細分析
    console.log('\n💰 トークン残高詳細分析:');
    let totalUserModelBalance = 0;
    let totalUserTokenPackBalance = 0;
    let totalSpentSum = 0;
    let totalChatMessagesSum = 0;

    for (const user of users) {
      console.log(`\n👤 ${user.name || 'Unnamed'} (${user.email})`);
      console.log(`  ID: ${user._id}`);

      // UserModelの残高
      const userModelBalance = user.tokenBalance || 0;
      console.log(`  📊 UserModel残高: ${userModelBalance.toLocaleString()}`);
      totalUserModelBalance += userModelBalance;

      // UserTokenPackから計算した残高
      const userTokenPacks = await UserTokenPackModel.find({ 
        userId: user._id, 
        isActive: true 
      });

      let userTokenPackBalance = 0;
      for (const pack of userTokenPacks) {
        userTokenPackBalance += pack.remainingTokens || 0;
      }
      console.log(`  💳 UserTokenPack残高: ${userTokenPackBalance.toLocaleString()}`);
      totalUserTokenPackBalance += userTokenPackBalance;

      // 残高の差異
      const balanceDifference = userModelBalance - userTokenPackBalance;
      if (Math.abs(balanceDifference) > 0) {
        console.log(`  ⚠️ 残高差異: ${balanceDifference.toLocaleString()}`);
      }

      // 総支払額の確認
      const totalSpent = user.totalSpent || 0;
      console.log(`  💸 総支払額: ${totalSpent.toLocaleString()}`);
      totalSpentSum += totalSpent;

      // PurchaseHistoryから実際の購入額を計算
      const actualPurchases = await PurchaseHistoryModel.aggregate([
        { $match: { userId: user._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const actualSpent = actualPurchases[0]?.total || 0;
      console.log(`  💳 実際の購入額: ${actualSpent.toLocaleString()}`);

      if (Math.abs(totalSpent - actualSpent) > 1) {
        console.log(`  ⚠️ 支払額差異: ${totalSpent - actualSpent}`);
      }

      // チャット数の確認
      const totalChatMessages = user.totalChatMessages || 0;
      console.log(`  💬 UserModelチャット数: ${totalChatMessages}`);
      totalChatMessagesSum += totalChatMessages;

      // ChatModelから実際のメッセージ数を計算
      const actualChatStats = await ChatModel.aggregate([
        { $match: { userId: user._id.toString() } },
        { $project: { messageCount: { $size: '$messages' } } },
        { $group: { _id: null, totalMessages: { $sum: '$messageCount' } } }
      ]);
      const actualChatMessages = actualChatStats[0]?.totalMessages || 0;
      console.log(`  💬 実際のメッセージ数: ${actualChatMessages}`);

      if (Math.abs(totalChatMessages - actualChatMessages) > 0) {
        console.log(`  ⚠️ チャット数差異: ${totalChatMessages - actualChatMessages}`);
      }
    }

    // 3. 全体サマリー
    console.log('\n📋 全体統計サマリー:');
    console.log(`👥 総ユーザー数: ${users.length}人`);
    console.log(`💰 UserModel総残高: ${totalUserModelBalance.toLocaleString()}`);
    console.log(`💳 UserTokenPack総残高: ${totalUserTokenPackBalance.toLocaleString()}`);
    console.log(`💸 総支払額: ${totalSpentSum.toLocaleString()}`);
    console.log(`💬 総チャット数: ${totalChatMessagesSum}`);

    const balanceDiscrepancy = totalUserModelBalance - totalUserTokenPackBalance;
    console.log(`⚖️ 残高差異: ${balanceDiscrepancy.toLocaleString()}`);

    // 4. 管理画面API動作のシミュレーション
    console.log('\n🔍 管理画面API動作シミュレーション:');

    // 現在のAPI実装（UserModel.tokenBalance集計）
    const currentApiStats = await UserModel.aggregate([
      { $match: { isActive: { $ne: false } } },
      { 
        $group: { 
          _id: null, 
          totalTokenBalance: { $sum: "$tokenBalance" },
          totalUsers: { $sum: 1 },
          averageBalance: { $avg: "$tokenBalance" },
          totalSpent: { $sum: "$totalSpent" },
          totalChatMessages: { $sum: "$totalChatMessages" }
        } 
      }
    ]);

    const currentStats = currentApiStats[0] || {};
    console.log('📊 現在のAPI統計:');
    console.log(`  総残高: ${(currentStats.totalTokenBalance || 0).toLocaleString()}`);
    console.log(`  総ユーザー数: ${currentStats.totalUsers || 0}`);
    console.log(`  平均残高: ${Math.round(currentStats.averageBalance || 0).toLocaleString()}`);
    console.log(`  総支払額: ${(currentStats.totalSpent || 0).toLocaleString()}`);
    console.log(`  総チャット数: ${currentStats.totalChatMessages || 0}`);

    // 5. 問題の特定と推奨アクション
    console.log('\n💡 問題の特定:');
    
    if (Math.abs(balanceDiscrepancy) > 1000) {
      console.log('🔴 重大な残高不一致が検出されました');
      console.log('   - UserModelとUserTokenPackの同期が必要');
    }

    if (totalSpentSum === 0 && users.length > 0) {
      console.log('🔴 総支払額がゼロです');
      console.log('   - UserModel.totalSpentフィールドの更新が必要');
    }

    if (totalChatMessagesSum === 0 && users.length > 0) {
      console.log('🔴 総チャット数がゼロです');
      console.log('   - UserModel.totalChatMessagesフィールドの更新が必要');
    }

    console.log('\n🎯 推奨アクション:');
    console.log('1. UserModelのトークン残高をUserTokenPackから再計算');
    console.log('2. totalSpentをPurchaseHistoryから再計算');
    console.log('3. totalChatMessagesをChatModelから再計算');
    console.log('4. 管理画面の統計表示ロジックの修正');

  } catch (error) {
    console.error('❌ 分析エラーが発生:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 分析完了');
  }
}

// 直接実行の場合
if (require.main === module) {
  analyzeTokenDiscrepancy();
}

module.exports = { analyzeTokenDiscrepancy };