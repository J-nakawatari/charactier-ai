#!/usr/bin/env node

/**
 * 🔍 トークンデータ検証スクリプト
 * 
 * 目的: UserTokenPackとUserModelの実際のデータ状況を確認
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

async function verifyTokenData() {
  try {
    console.log('🔍 トークンデータ検証開始...');
    
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('環境変数MONGO_URIが設定されていません');
    }
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ データベース接続成功');

    // 1. UserTokenPackのデータ確認
    console.log('\n📦 UserTokenPackデータ確認...');
    const userTokenPacks = await UserTokenPackModel.find({}).lean();
    console.log(`💳 UserTokenPack件数: ${userTokenPacks.length}件`);

    if (userTokenPacks.length > 0) {
      console.log('\n📋 UserTokenPack一覧:');
      userTokenPacks.forEach((pack, index) => {
        console.log(`  ${index + 1}. ユーザーID: ${pack.userId}`);
        console.log(`     購入額: ${pack.purchaseAmountYen || 'N/A'}円`);
        console.log(`     購入トークン: ${pack.tokensPurchased || 'N/A'}`);
        console.log(`     残りトークン: ${pack.tokensRemaining || 'N/A'}`);
        console.log(`     アクティブ: ${pack.isActive}`);
        console.log(`     購入日: ${pack.purchaseDate || 'N/A'}`);
      });
    } else {
      console.log('⚠️ UserTokenPackにデータがありません');
    }

    // 2. UserModelのトークン残高確認
    console.log('\n👥 UserModelトークン残高確認...');
    const users = await UserModel.find({ isActive: { $ne: false } })
      .select('_id name email tokenBalance totalSpent totalChatMessages')
      .lean();

    console.log(`👤 ユーザー数: ${users.length}人`);
    
    let totalUserModelBalance = 0;
    users.forEach((user, index) => {
      console.log(`\n  ${index + 1}. ${user.name || 'Unnamed'} (${user.email})`);
      console.log(`     ID: ${user._id}`);
      console.log(`     tokenBalance: ${(user.tokenBalance || 0).toLocaleString()}`);
      console.log(`     totalSpent: ${(user.totalSpent || 0).toLocaleString()}`);
      console.log(`     totalChatMessages: ${user.totalChatMessages || 0}`);
      totalUserModelBalance += user.tokenBalance || 0;
    });

    console.log(`\n💰 UserModel総残高: ${totalUserModelBalance.toLocaleString()}`);

    // 3. コレクション一覧の確認
    console.log('\n📚 データベースコレクション一覧...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const tokenRelatedCollections = collections.filter(col => 
      col.name.toLowerCase().includes('token') || 
      col.name.toLowerCase().includes('purchase') ||
      col.name.toLowerCase().includes('payment')
    );

    if (tokenRelatedCollections.length > 0) {
      console.log('🔍 トークン関連コレクション:');
      for (const col of tokenRelatedCollections) {
        const count = await mongoose.connection.db.collection(col.name).countDocuments();
        console.log(`  - ${col.name}: ${count}件`);
      }
    }

    // 4. 別のトークンパックコレクションの確認
    console.log('\n🔍 その他のトークン関連データ確認...');
    
    // tokenpacks コレクションの確認
    try {
      const tokenPacksCount = await mongoose.connection.db.collection('tokenpacks').countDocuments();
      console.log(`📦 tokenpacks コレクション: ${tokenPacksCount}件`);
      
      if (tokenPacksCount > 0) {
        const tokenPacks = await mongoose.connection.db.collection('tokenpacks').find({}).limit(5).toArray();
        console.log('サンプルデータ:');
        tokenPacks.forEach((pack, index) => {
          console.log(`  ${index + 1}. ${JSON.stringify(pack, null, 2)}`);
        });
      }
    } catch (error) {
      console.log('📦 tokenpacks コレクションなし');
    }

    // user_token_packs コレクションの確認
    try {
      const userTokenPacksCount = await mongoose.connection.db.collection('user_token_packs').countDocuments();
      console.log(`📦 user_token_packs コレクション: ${userTokenPacksCount}件`);
      
      if (userTokenPacksCount > 0) {
        const userTokenPacks = await mongoose.connection.db.collection('user_token_packs').find({}).limit(5).toArray();
        console.log('サンプルデータ:');
        userTokenPacks.forEach((pack, index) => {
          console.log(`  ${index + 1}. ${JSON.stringify(pack, null, 2)}`);
        });
      }
    } catch (error) {
      console.log('📦 user_token_packs コレクションなし');
    }

    // 5. 結論と推奨アクション
    console.log('\n💡 検証結果と推奨アクション:');
    
    if (userTokenPacks.length === 0 && totalUserModelBalance > 0) {
      console.log('🔴 問題: UserTokenPackが空だが、UserModelにトークン残高がある');
      console.log('📋 可能な原因:');
      console.log('  1. UserTokenPackシステム導入前のレガシーデータ');
      console.log('  2. 異なるコレクション名でのデータ保存');
      console.log('  3. マイグレーション未完了');
      console.log('');
      console.log('🎯 推奨対応:');
      console.log('  1. 管理画面表示をUserModel.tokenBalanceに戻す（暫定対応）');
      console.log('  2. 実際のトークンパック購入データの確認');
      console.log('  3. 必要に応じてUserTokenPackへのマイグレーション');
    }

  } catch (error) {
    console.error('❌ 検証エラーが発生:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 検証完了');
  }
}

// 直接実行の場合
if (require.main === module) {
  verifyTokenData();
}

module.exports = { verifyTokenData };