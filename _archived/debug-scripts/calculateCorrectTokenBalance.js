#!/usr/bin/env node

/**
 * 🔧 正確なトークン残高計算・修正スクリプト
 * 
 * 目的: UserTokenPackデータから正確なトークン残高を計算し、統計表示を修正
 */

const mongoose = require('mongoose');
require('dotenv').config();

// UserTokenPackの定義
const UserTokenPackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stripeSessionId: String,
  purchaseAmountYen: Number,
  tokensPurchased: Number,
  tokensRemaining: Number,
  isActive: Boolean,
  purchaseDate: Date
});

// 静的メソッド：ユーザーの総トークン残高計算
UserTokenPackSchema.statics.calculateUserTokenBalance = async function(userId) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        totalRemaining: { $sum: '$tokensRemaining' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0].totalRemaining : 0;
};

const UserTokenPackModel = mongoose.model('UserTokenPack', UserTokenPackSchema);

// UserModelの定義
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  tokenBalance: Number,
  totalSpent: Number,
  totalChatMessages: Number,
  accountStatus: String,
  isActive: Boolean
});

const UserModel = mongoose.model('User', UserSchema);

async function calculateCorrectTokenBalance() {
  try {
    console.log('🔧 正確なトークン残高計算開始...');
    
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('環境変数MONGO_URIが設定されていません');
    }
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ データベース接続成功');

    // 全ユーザーを取得
    const users = await UserModel.find({ isActive: { $ne: false } })
      .select('_id name email tokenBalance')
      .lean();

    console.log(`👥 処理対象ユーザー数: ${users.length}人`);

    let totalUserModelBalance = 0;
    let totalUserTokenPackBalance = 0;

    for (const user of users) {
      console.log(`\n👤 ${user.name || 'Unnamed'} (${user.email})`);
      console.log(`  ID: ${user._id}`);

      // UserModelの残高
      const userModelBalance = user.tokenBalance || 0;
      console.log(`  📊 UserModel残高: ${userModelBalance.toLocaleString()}`);
      totalUserModelBalance += userModelBalance;

      // UserTokenPackから正確な残高を計算
      const actualBalance = await UserTokenPackModel.calculateUserTokenBalance(user._id);
      console.log(`  💳 UserTokenPack残高: ${actualBalance.toLocaleString()}`);
      totalUserTokenPackBalance += actualBalance;

      // 差異の確認
      const difference = userModelBalance - actualBalance;
      if (Math.abs(difference) > 0) {
        console.log(`  ⚠️ 残高差異: ${difference.toLocaleString()}`);
      }

      // ユーザーのUserTokenPack詳細
      const userPacks = await UserTokenPackModel.find({ 
        userId: user._id, 
        isActive: true 
      }).select('purchaseAmountYen tokensPurchased tokensRemaining purchaseDate');

      console.log(`  📦 アクティブなトークンパック: ${userPacks.length}件`);
      if (userPacks.length > 0) {
        let totalPurchased = 0;
        let totalRemaining = 0;
        userPacks.forEach((pack, index) => {
          totalPurchased += pack.tokensPurchased || 0;
          totalRemaining += pack.tokensRemaining || 0;
          if (index < 3) { // 最初の3件のみ表示
            console.log(`    ${index + 1}. 購入: ${(pack.tokensPurchased || 0).toLocaleString()}, 残り: ${(pack.tokensRemaining || 0).toLocaleString()}`);
          }
        });
        if (userPacks.length > 3) {
          console.log(`    ... 他${userPacks.length - 3}件`);
        }
        console.log(`  📈 総購入: ${totalPurchased.toLocaleString()}, 総残り: ${totalRemaining.toLocaleString()}`);
      }
    }

    // 全体統計
    console.log('\n📊 全体統計:');
    console.log(`💰 UserModel総残高: ${totalUserModelBalance.toLocaleString()}`);
    console.log(`💳 UserTokenPack総残高: ${totalUserTokenPackBalance.toLocaleString()}`);
    console.log(`⚖️ 残高差異: ${(totalUserModelBalance - totalUserTokenPackBalance).toLocaleString()}`);

    // 管理画面API修正の提案
    console.log('\n🔧 管理画面API修正提案:');
    
    const apiTestData = {
      users: [],
      tokenStats: {
        totalBalance: totalUserTokenPackBalance, // 正確な残高
        totalUsers: users.length,
        averageBalance: users.length > 0 ? Math.round(totalUserTokenPackBalance / users.length) : 0
      }
    };

    // 各ユーザーの正確な残高でformattedUsersを作成
    for (const user of users) {
      const actualBalance = await UserTokenPackModel.calculateUserTokenBalance(user._id);
      apiTestData.users.push({
        id: user._id.toString(),
        _id: user._id.toString(),
        name: user.name || 'Unnamed',
        email: user.email || 'no-email@example.com',
        tokenBalance: actualBalance, // 正確な残高
        // 他のフィールドは省略
      });
    }

    console.log('📋 修正後のAPI応答例:');
    console.log(JSON.stringify({
      tokenStats: apiTestData.tokenStats,
      userSample: apiTestData.users.slice(0, 2) // 最初の2人のサンプル
    }, null, 2));

    // 修正されたAPI統計の確認
    console.log('\n✅ 修正後の管理画面表示予定値:');
    console.log(`  総トークン残高: ${apiTestData.tokenStats.totalBalance.toLocaleString()}`);
    console.log(`  総ユーザー数: ${apiTestData.tokenStats.totalUsers}`);
    console.log(`  平均残高: ${apiTestData.tokenStats.averageBalance.toLocaleString()}`);

    // 現在の問題の原因特定
    console.log('\n🔍 問題の原因特定:');
    console.log('1. UserModelのtokenBalanceが古いデータ（11,809,760）');
    console.log('2. UserTokenPackは正確なデータを持っている');
    console.log('3. 管理画面APIでUserTokenPack.calculateUserTokenBalanceを正しく呼び出せていない');
    console.log('');
    console.log('🎯 解決策:');
    console.log('1. UserTokenPack.calculateUserTokenBalanceの呼び出しを修正');
    console.log('2. エラーハンドリングの改善');
    console.log('3. 統計計算の修正');

  } catch (error) {
    console.error('❌ 計算エラーが発生:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 計算完了');
  }
}

// 直接実行の場合
if (require.main === module) {
  calculateCorrectTokenBalance();
}

module.exports = { calculateCorrectTokenBalance };