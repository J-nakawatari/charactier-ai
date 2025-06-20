#!/usr/bin/env node

/**
 * 🔍 ユーザー表示可視性分析スクリプト
 * 
 * 目的: BANされたユーザーや非表示ユーザーの状況を調査
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

async function analyzeUserVisibility() {
  try {
    console.log('🔍 ユーザー表示可視性分析開始...');
    
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('環境変数MONGO_URIが設定されていません');
    }
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ データベース接続成功');

    // 1. 全ユーザーの状況確認（削除されていないユーザー）
    console.log('\n👥 全ユーザー状況分析...');
    
    const allUsers = await UserModel.find({}).lean();
    console.log(`📊 データベース内総ユーザー数: ${allUsers.length}人`);

    // ステータス別の分類
    const usersByStatus = {
      active: [],
      banned: [],
      suspended: [],
      inactive: [],
      deleted: []
    };

    allUsers.forEach(user => {
      if (user.isActive === false) {
        usersByStatus.deleted.push(user);
      } else if (user.accountStatus === 'banned') {
        usersByStatus.banned.push(user);
      } else if (user.accountStatus === 'suspended') {
        usersByStatus.suspended.push(user);
      } else if (user.accountStatus === 'inactive') {
        usersByStatus.inactive.push(user);
      } else {
        usersByStatus.active.push(user);
      }
    });

    console.log('\n📋 ステータス別ユーザー数:');
    console.log(`  🟢 アクティブ: ${usersByStatus.active.length}人`);
    console.log(`  🔴 BAN: ${usersByStatus.banned.length}人`);
    console.log(`  🟡 停止中: ${usersByStatus.suspended.length}人`);
    console.log(`  ⚪ 非アクティブ: ${usersByStatus.inactive.length}人`);
    console.log(`  ❌ 削除済み: ${usersByStatus.deleted.length}人`);

    // 2. 各カテゴリの詳細表示
    console.log('\n👤 ユーザー詳細一覧:');
    
    allUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || 'Unnamed'} (${user.email})`);
      console.log(`   ID: ${user._id}`);
      console.log(`   アカウント状態: ${user.accountStatus || 'active'}`);
      console.log(`   isActive: ${user.isActive !== false}`);
      console.log(`   違反回数: ${user.violationCount || 0}`);
      console.log(`   トークン残高: ${(user.tokenBalance || 0).toLocaleString()}`);
      console.log(`   総支払額: ${(user.totalSpent || 0).toLocaleString()}`);
      console.log(`   作成日: ${user.createdAt ? user.createdAt.toISOString().substring(0, 10) : 'N/A'}`);
      
      if (user.suspensionEndDate) {
        console.log(`   停止終了日: ${user.suspensionEndDate.toISOString().substring(0, 10)}`);
      }
      if (user.lastViolationDate) {
        console.log(`   最終違反日: ${user.lastViolationDate.toISOString().substring(0, 10)}`);
      }
    });

    // 3. 現在の管理画面フィルター条件の確認
    console.log('\n🔍 現在の管理画面フィルター分析...');
    
    // 現在のクエリ: { isActive: { $ne: false } }
    const currentDisplayUsers = await UserModel.find({ 
      isActive: { $ne: false } 
    }).lean();
    
    console.log(`📊 現在表示されるユーザー数: ${currentDisplayUsers.length}人`);
    console.log('表示されるユーザー:');
    currentDisplayUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name || 'Unnamed'} (${user.accountStatus || 'active'})`);
    });

    // 表示されていないユーザー
    const hiddenUsers = allUsers.filter(user => user.isActive === false);
    console.log(`\n❌ 現在非表示のユーザー数: ${hiddenUsers.length}人`);
    if (hiddenUsers.length > 0) {
      console.log('非表示ユーザー:');
      hiddenUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name || 'Unnamed'} (${user.email})`);
        console.log(`     理由: isActive = ${user.isActive}, accountStatus = ${user.accountStatus || 'active'}`);
        console.log(`     違反回数: ${user.violationCount || 0}`);
      });
    }

    // 4. 推奨修正案
    console.log('\n💡 推奨修正案:');
    console.log('現在のフィルター: { isActive: { $ne: false } }');
    console.log('');
    console.log('📋 オプション1 - 論理削除以外は全て表示:');
    console.log('  フィルター: {} (全てのユーザー)');
    console.log('  または: { deletedAt: { $exists: false } } (論理削除フィールドがある場合)');
    console.log('');
    console.log('📋 オプション2 - isActiveをtrueに戻す:');
    console.log('  BANユーザーのisActiveをtrueに戻し、accountStatus="banned"で管理');
    console.log('');
    console.log('📋 オプション3 - 複合フィルター:');
    console.log('  { $or: [{ isActive: true }, { accountStatus: { $in: ["banned", "suspended"] } }] }');

    // 5. 各修正案での表示予定ユーザー数
    console.log('\n📊 各修正案での表示予定数:');
    
    // オプション1: 全てのユーザー
    console.log(`  オプション1 (全表示): ${allUsers.length}人`);
    
    // オプション2: BANユーザーのisActiveを修正した場合の予測
    const wouldBeVisibleCount = allUsers.filter(user => 
      user.isActive !== false || ['banned', 'suspended'].includes(user.accountStatus)
    ).length;
    console.log(`  オプション2・3 (BAN/停止も表示): ${wouldBeVisibleCount}人`);

    // 6. 結論
    console.log('\n🎯 結論:');
    if (hiddenUsers.length > 0) {
      console.log(`🔴 ${hiddenUsers.length}人のユーザーが管理画面に表示されていません`);
      console.log('🔧 推奨アクション: 管理画面のフィルター条件を修正してBANユーザーも表示する');
    } else {
      console.log('✅ 全てのアクティブユーザーが正しく表示されています');
    }

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
  analyzeUserVisibility();
}

module.exports = { analyzeUserVisibility };