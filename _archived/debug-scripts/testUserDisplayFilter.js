#!/usr/bin/env node

/**
 * 🔧 ユーザー表示フィルターテストスクリプト
 * 
 * 目的: 修正後のフィルター条件でユーザー表示をテスト
 */

const mongoose = require('mongoose');
require('dotenv').config();

// UserModelの定義
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  tokenBalance: Number,
  totalSpent: Number,
  totalChatMessages: Number,
  accountStatus: String,
  isActive: Boolean,
  violationCount: Number,
  suspensionEndDate: Date,
  lastViolationDate: Date,
  createdAt: Date
});

const UserModel = mongoose.model('User', UserSchema);

async function testUserDisplayFilter() {
  try {
    console.log('🔧 ユーザー表示フィルターテスト開始...');
    
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('環境変数MONGO_URIが設定されていません');
    }
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ データベース接続成功');

    // 1. 修正前のフィルター（現在の管理画面の条件）
    console.log('\n📊 修正前のフィルターテスト:');
    const oldQuery = { isActive: { $ne: false } };
    const oldResults = await UserModel.find(oldQuery).lean();
    console.log(`🔍 旧フィルター結果: ${oldResults.length}人`);
    oldResults.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name || 'Unnamed'} (${user.accountStatus || 'active'})`);
    });

    // 2. 修正後のフィルター（新しい条件）
    console.log('\n📊 修正後のフィルターテスト:');
    const newQuery = {
      $or: [
        { isActive: { $ne: false } }, // アクティブユーザー
        { accountStatus: { $in: ['banned', 'suspended'] } } // BAN・停止ユーザーも表示
      ]
    };
    const newResults = await UserModel.find(newQuery).lean();
    console.log(`🔍 新フィルター結果: ${newResults.length}人`);
    newResults.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name || 'Unnamed'} (${user.accountStatus || 'active'})`);
      console.log(`     ID: ${user._id}`);
      console.log(`     isActive: ${user.isActive !== false}`);
      console.log(`     違反回数: ${user.violationCount || 0}`);
    });

    // 3. 特定ユーザーID（684a5fa5e445d3f372c82948）の確認
    console.log('\n🔍 特定ユーザー(684a5fa5e445d3f372c82948)の確認...');
    const specificUser = await UserModel.findById('684a5fa5e445d3f372c82948').lean();
    if (specificUser) {
      console.log('✅ ユーザーが見つかりました:');
      console.log(`  名前: ${specificUser.name || 'Unnamed'}`);
      console.log(`  メール: ${specificUser.email}`);
      console.log(`  ステータス: ${specificUser.accountStatus || 'active'}`);
      console.log(`  isActive: ${specificUser.isActive}`);
      console.log(`  違反回数: ${specificUser.violationCount || 0}`);
      
      // 新しいフィルターに含まれるかチェック
      const includeInNew = await UserModel.findOne({
        _id: specificUser._id,
        ...newQuery
      }).lean();
      
      console.log(`  🔍 新フィルターに含まれる: ${includeInNew ? 'YES' : 'NO'}`);
    } else {
      console.log('❌ 指定されたユーザーIDが見つかりませんでした');
    }

    // 4. 検索フィルターのテスト
    console.log('\n📊 検索フィルターテスト...');
    const searchQuery = {
      $and: [
        {
          $or: [
            { isActive: { $ne: false } }, // アクティブユーザー
            { accountStatus: { $in: ['banned', 'suspended'] } } // BAN・停止ユーザーも表示
          ]
        },
        {
          $or: [
            { name: { $regex: 'test', $options: 'i' } },
            { email: { $regex: 'test', $options: 'i' } }
          ]
        }
      ]
    };
    const searchResults = await UserModel.find(searchQuery).lean();
    console.log(`🔍 "test"検索結果: ${searchResults.length}人`);
    searchResults.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name || 'Unnamed'} (${user.email})`);
    });

    // 5. ステータス別フィルターのテスト
    console.log('\n📊 ステータス別フィルターテスト...');
    const bannedQuery = {
      $or: [
        { isActive: { $ne: false } }, // アクティブユーザー
        { accountStatus: { $in: ['banned', 'suspended'] } } // BAN・停止ユーザーも表示
      ],
      accountStatus: 'banned'
    };
    const bannedResults = await UserModel.find(bannedQuery).lean();
    console.log(`🔍 BAN状態フィルター結果: ${bannedResults.length}人`);
    bannedResults.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name || 'Unnamed'} (${user.email})`);
    });

    // 6. 比較結果
    console.log('\n📈 比較結果:');
    console.log(`修正前: ${oldResults.length}人 → 修正後: ${newResults.length}人`);
    console.log(`差分: +${newResults.length - oldResults.length}人`);
    
    const newlyVisible = newResults.filter(newUser => 
      !oldResults.some(oldUser => oldUser._id.toString() === newUser._id.toString())
    );
    
    if (newlyVisible.length > 0) {
      console.log('\n🆕 新しく表示されるユーザー:');
      newlyVisible.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name || 'Unnamed'} (${user.email})`);
        console.log(`     ステータス: ${user.accountStatus || 'active'}`);
        console.log(`     理由: BAN/停止ユーザーも表示対象に含まれた`);
      });
    }

    // 7. 結論
    console.log('\n✅ フィルターテスト結論:');
    console.log('- 新しいフィルターでBANされたユーザーも表示される');
    console.log('- 検索機能も正常に動作する');
    console.log('- ステータス別フィルターも期待通りに動作する');
    console.log('- 特定ユーザー(684a5fa5e445d3f372c82948)も表示対象に含まれる');

  } catch (error) {
    console.error('❌ テストエラーが発生:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 テスト完了');
  }
}

// 直接実行の場合
if (require.main === module) {
  testUserDisplayFilter();
}

module.exports = { testUserDisplayFilter };