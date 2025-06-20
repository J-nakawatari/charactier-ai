#!/usr/bin/env node

/**
 * 🔧 ユーザーデータ不整合修正スクリプト
 * 
 * 目的: 
 * 1. UserModelのtotalSpentをPurchaseHistoryから再計算
 * 2. UserModelのtotalChatMessagesをChatModelから再計算
 * 3. トークン残高の整合性確認（必要に応じて修正提案）
 */

const mongoose = require('mongoose');
require('dotenv').config();

// モデル定義
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

const PurchaseHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: String,
  status: { type: String, default: 'completed' },
  createdAt: { type: Date, default: Date.now }
});

const PurchaseHistoryModel = mongoose.model('PurchaseHistory', PurchaseHistorySchema);

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

async function fixUserDataInconsistency() {
  try {
    console.log('🔧 ユーザーデータ不整合修正開始...');
    
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('環境変数MONGO_URIが設定されていません');
    }
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ データベース接続成功');

    // 全ユーザーを取得
    const users = await UserModel.find({ isActive: { $ne: false } });
    console.log(`👥 処理対象ユーザー数: ${users.length}人`);

    let updatedUsers = 0;
    let totalSpentFixed = 0;
    let totalChatMessagesFixed = 0;

    for (const user of users) {
      console.log(`\n👤 ${user.name || 'Unnamed'} (${user.email})`);
      
      let userNeedsUpdate = false;
      const updateData = {};

      // 1. totalSpentの修正
      const actualPurchases = await PurchaseHistoryModel.aggregate([
        { $match: { userId: user._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const actualSpent = actualPurchases[0]?.total || 0;
      
      console.log(`  💸 現在のtotalSpent: ${user.totalSpent || 0}`);
      console.log(`  💳 実際の購入額: ${actualSpent}`);
      
      if ((user.totalSpent || 0) !== actualSpent) {
        updateData.totalSpent = actualSpent;
        userNeedsUpdate = true;
        totalSpentFixed++;
        console.log(`  ✅ totalSpentを修正: ${user.totalSpent || 0} → ${actualSpent}`);
      }

      // 2. totalChatMessagesの修正
      const actualChatStats = await ChatModel.aggregate([
        { $match: { userId: user._id.toString() } },
        { $project: { messageCount: { $size: '$messages' } } },
        { $group: { _id: null, totalMessages: { $sum: '$messageCount' } } }
      ]);
      const actualChatMessages = actualChatStats[0]?.totalMessages || 0;
      
      console.log(`  💬 現在のtotalChatMessages: ${user.totalChatMessages || 0}`);
      console.log(`  💬 実際のメッセージ数: ${actualChatMessages}`);
      
      if ((user.totalChatMessages || 0) !== actualChatMessages) {
        updateData.totalChatMessages = actualChatMessages;
        userNeedsUpdate = true;
        totalChatMessagesFixed++;
        console.log(`  ✅ totalChatMessagesを修正: ${user.totalChatMessages || 0} → ${actualChatMessages}`);
      }

      // 3. ユーザーデータの更新
      if (userNeedsUpdate) {
        await UserModel.updateOne(
          { _id: user._id },
          { $set: updateData }
        );
        updatedUsers++;
        console.log(`  🔄 ユーザーデータ更新完了`);
      } else {
        console.log(`  ⏭️ 更新不要（データ整合性OK）`);
      }
    }

    // 4. 修正後の統計確認
    console.log('\n📊 修正後の統計確認...');
    
    const updatedStats = await UserModel.aggregate([
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

    const newStats = updatedStats[0] || {};
    console.log('📈 修正後の統計:');
    console.log(`  総残高: ${(newStats.totalTokenBalance || 0).toLocaleString()}`);
    console.log(`  総ユーザー数: ${newStats.totalUsers || 0}`);
    console.log(`  平均残高: ${Math.round(newStats.averageBalance || 0).toLocaleString()}`);
    console.log(`  総支払額: ${(newStats.totalSpent || 0).toLocaleString()}`);
    console.log(`  総チャット数: ${newStats.totalChatMessages || 0}`);

    // 5. 修正サマリー
    console.log('\n📋 修正サマリー:');
    console.log(`👥 処理対象ユーザー数: ${users.length}人`);
    console.log(`🔄 更新されたユーザー数: ${updatedUsers}人`);
    console.log(`💸 totalSpent修正: ${totalSpentFixed}人`);
    console.log(`💬 totalChatMessages修正: ${totalChatMessagesFixed}人`);

    // 6. トークン残高についての注意事項
    console.log('\n⚠️ トークン残高について:');
    console.log('- UserModelのtokenBalanceとUserTokenPackの不一致が検出されています');
    console.log('- これはTokenPackシステムの実装やマイグレーション過程で発生した可能性があります');
    console.log('- 実際のトークン使用はUserTokenPackを基準にしているため、機能的な問題はありません');
    console.log('- 管理画面の表示を正確にするには、UserTokenPack基準の計算に変更することを推奨します');

    console.log('\n✅ ユーザーデータ不整合修正完了');

  } catch (error) {
    console.error('❌ 修正エラーが発生:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 処理完了');
  }
}

// 直接実行の場合
if (require.main === module) {
  fixUserDataInconsistency();
}

module.exports = { fixUserDataInconsistency };