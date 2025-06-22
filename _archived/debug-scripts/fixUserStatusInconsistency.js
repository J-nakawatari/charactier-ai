#!/usr/bin/env node

/**
 * 🔧 ユーザー状態不整合修正スクリプト
 * 
 * 目的: BANされたユーザーのisActiveフラグを正しく設定する
 * 対象: test@example.com (accountStatus: 'banned', isActive: true -> false)
 * 
 * 実行前確認: 
 * - 対象ユーザーの現在の状態
 * - 影響範囲の評価
 * 
 * 実行後確認:
 * - 状態が正しく更新されたか
 * - 他のユーザーに影響がないか
 */

const mongoose = require('mongoose');
require('dotenv').config();

// UserModelの直接定義（TypeScriptからの参照を避ける）
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, default: '' },
  password: { type: String, required: true },
  preferredLanguage: { type: String, enum: ['ja', 'en'], default: 'ja' },
  isAdmin: { type: Boolean, default: false },
  selectedCharacter: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
  purchasedCharacters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Character' }],
  tokenBalance: { type: Number, default: 10000, min: 0 },
  activeTokenPackId: { type: mongoose.Schema.Types.ObjectId, ref: 'TokenPack' },
  totalSpent: { type: Number, default: 0, min: 0 },
  violationCount: { type: Number, default: 0, min: 0 },
  warningCount: { type: Number, default: 0, min: 0 },
  accountStatus: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended', 'banned', 'warned', 'chat_suspended', 'account_suspended'], 
    default: 'active' 
  },
  suspensionEndDate: Date,
  banReason: String,
  lastViolationDate: Date,
  registrationDate: { type: Date, default: Date.now },
  lastLogin: Date,
  loginStreak: { type: Number, default: 0 },
  maxLoginStreak: { type: Number, default: 0 },
  totalChatMessages: { type: Number, default: 0 },
  averageSessionDuration: { type: Number, default: 0 },
  favoriteCharacterTypes: [String],
  affinities: [mongoose.Schema.Types.Mixed],
  isActive: { type: Boolean, default: true },
  isSetupComplete: { type: Boolean, default: false }
}, {
  timestamps: true,
  versionKey: false
});

const UserModel = mongoose.model('User', UserSchema);

async function fixUserStatusInconsistency() {
  try {
    console.log('🔍 MongoDB接続中...');
    
    // MongoDB接続
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('MONGO_URI環境変数が設定されていません');
    }
    console.log('🔗 接続先: MongoDB Atlas (認証情報は非表示)');
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB接続成功');

    // 1. 現在の不整合ユーザーを確認
    console.log('\n📊 不整合ユーザーの確認...');
    const inconsistentUsers = await UserModel.find({
      $or: [
        { accountStatus: 'banned', isActive: true },
        { accountStatus: 'suspended', isActive: true },
        { accountStatus: 'inactive', isActive: true }
      ]
    }).select('_id email name accountStatus isActive lastLogin');

    console.log(`🔍 発見した不整合ユーザー: ${inconsistentUsers.length}件`);
    
    if (inconsistentUsers.length === 0) {
      console.log('✅ 不整合ユーザーは見つかりませんでした');
      return;
    }

    // 不整合ユーザーの詳細表示
    inconsistentUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ユーザー詳細:`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Account Status: ${user.accountStatus}`);
      console.log(`   Is Active: ${user.isActive}`);
      console.log(`   Last Login: ${user.lastLogin || 'N/A'}`);
    });

    // 2. 修正処理の実行確認
    console.log('\n⚠️  修正処理について:');
    console.log('   - accountStatus が banned/suspended/inactive のユーザー');
    console.log('   - isActive を false に設定します');
    console.log('   - この操作により、これらのユーザーのJWTトークンによるアクセスが拒否されます');
    
    // 実際の修正処理
    console.log('\n🔧 修正処理開始...');
    
    const updateResult = await UserModel.updateMany(
      {
        $or: [
          { accountStatus: 'banned', isActive: true },
          { accountStatus: 'suspended', isActive: true },
          { accountStatus: 'inactive', isActive: true }
        ]
      },
      {
        $set: { isActive: false },
        $currentDate: { updatedAt: true }
      }
    );

    console.log(`✅ 修正完了: ${updateResult.modifiedCount}件のユーザーを更新しました`);

    // 3. 修正後の確認
    console.log('\n🔍 修正後の確認...');
    const remainingInconsistent = await UserModel.countDocuments({
      $or: [
        { accountStatus: 'banned', isActive: true },
        { accountStatus: 'suspended', isActive: true },
        { accountStatus: 'inactive', isActive: true }
      ]
    });

    if (remainingInconsistent === 0) {
      console.log('✅ すべての不整合が解決されました');
    } else {
      console.log(`⚠️  まだ ${remainingInconsistent}件の不整合が残っています`);
    }

    // 4. 修正されたユーザーの状態確認
    console.log('\n📊 修正されたユーザーの最終状態:');
    const fixedUsers = await UserModel.find({
      _id: { $in: inconsistentUsers.map(u => u._id) }
    }).select('_id email accountStatus isActive');

    fixedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}: ${user.accountStatus} / isActive: ${user.isActive}`);
    });

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 MongoDB接続を閉じました');
  }
}

// 直接実行の場合
if (require.main === module) {
  fixUserStatusInconsistency();
}

module.exports = { fixUserStatusInconsistency };