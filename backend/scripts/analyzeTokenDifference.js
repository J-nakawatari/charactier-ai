#!/usr/bin/env node

/**
 * ユーザー画面と管理画面のトークン残高差異を分析するスクリプト
 * 
 * 調査項目:
 * 1. 管理画面のクエリ条件: { isActive: { $ne: false } }
 * 2. ユーザー画面のクエリ条件: 全ユーザー（条件なし）
 * 3. 除外されるユーザーの特定
 */

const mongoose = require('mongoose');
require('dotenv').config();

// TypeScriptモデルをRequireする
const { UserModel } = require('../src/models/UserModel.ts');

async function analyzeTokenDifference() {
  try {
    console.log('🔍 トークン残高差異分析開始');
    
    // MongoDB接続
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI環境変数が設定されていません');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB接続成功');

    console.log('\n=== 1. 管理画面クエリ分析 ===');
    const adminQuery = {
      isActive: { $ne: false } // 管理画面で使用されるクエリ
    };
    
    const adminResult = await UserModel.aggregate([
      { $match: adminQuery },
      { 
        $group: { 
          _id: null, 
          totalTokenBalance: { $sum: "$tokenBalance" },
          totalUsers: { $sum: 1 },
          averageBalance: { $avg: "$tokenBalance" }
        } 
      }
    ]);
    
    const adminStats = adminResult[0] || { totalTokenBalance: 0, totalUsers: 0, averageBalance: 0 };
    console.log('📊 管理画面統計:');
    console.log('  - 対象ユーザー数:', adminStats.totalUsers.toLocaleString());
    console.log('  - 総トークン残高:', adminStats.totalTokenBalance.toLocaleString());
    console.log('  - 平均残高:', Math.round(adminStats.averageBalance || 0).toLocaleString());

    console.log('\n=== 2. 全ユーザークエリ分析 ===');
    const allUsersResult = await UserModel.aggregate([
      { 
        $group: { 
          _id: null, 
          totalTokenBalance: { $sum: "$tokenBalance" },
          totalUsers: { $sum: 1 },
          averageBalance: { $avg: "$tokenBalance" }
        } 
      }
    ]);
    
    const allStats = allUsersResult[0] || { totalTokenBalance: 0, totalUsers: 0, averageBalance: 0 };
    console.log('📊 全ユーザー統計:');
    console.log('  - 対象ユーザー数:', allStats.totalUsers.toLocaleString());
    console.log('  - 総トークン残高:', allStats.totalTokenBalance.toLocaleString());
    console.log('  - 平均残高:', Math.round(allStats.averageBalance || 0).toLocaleString());

    console.log('\n=== 3. 差分分析 ===');
    const tokenDifference = allStats.totalTokenBalance - adminStats.totalTokenBalance;
    const userDifference = allStats.totalUsers - adminStats.totalUsers;
    
    console.log('📈 差分:');
    console.log('  - トークン差分:', tokenDifference.toLocaleString());
    console.log('  - ユーザー数差分:', userDifference.toLocaleString());
    
    if (tokenDifference !== 0) {
      console.log('  - 差分率:', ((tokenDifference / allStats.totalTokenBalance) * 100).toFixed(2) + '%');
    }

    console.log('\n=== 4. 除外ユーザー分析 ===');
    
    // isActive: false のユーザー
    const explicitInactiveUsers = await UserModel.find({ isActive: false })
      .select('_id name email tokenBalance isActive createdAt')
      .lean();
    
    console.log('🚫 明示的に非アクティブなユーザー (isActive: false):');
    console.log('  - ユーザー数:', explicitInactiveUsers.length);
    
    if (explicitInactiveUsers.length > 0) {
      const explicitInactiveBalance = explicitInactiveUsers.reduce((sum, user) => sum + (user.tokenBalance || 0), 0);
      console.log('  - トークン合計:', explicitInactiveBalance.toLocaleString());
      console.log('  - 詳細:');
      explicitInactiveUsers.forEach((user, index) => {
        if (index < 10) { // 最初の10人だけ表示
          console.log(`    ${index + 1}. ${user.name} (${user.email}) - ${(user.tokenBalance || 0).toLocaleString()} tokens`);
        }
      });
      if (explicitInactiveUsers.length > 10) {
        console.log(`    ... 他 ${explicitInactiveUsers.length - 10} 人`);
      }
    }
    
    // isActive が未設定のユーザー
    const undefinedActiveUsers = await UserModel.find({ 
      $or: [
        { isActive: { $exists: false } },
        { isActive: null }
      ]
    })
      .select('_id name email tokenBalance isActive createdAt')
      .lean();
    
    console.log('\n❓ isActiveが未設定のユーザー:');
    console.log('  - ユーザー数:', undefinedActiveUsers.length);
    
    if (undefinedActiveUsers.length > 0) {
      const undefinedBalance = undefinedActiveUsers.reduce((sum, user) => sum + (user.tokenBalance || 0), 0);
      console.log('  - トークン合計:', undefinedBalance.toLocaleString());
      console.log('  - 詳細:');
      undefinedActiveUsers.forEach((user, index) => {
        if (index < 10) {
          console.log(`    ${index + 1}. ${user.name} (${user.email}) - ${(user.tokenBalance || 0).toLocaleString()} tokens - isActive: ${user.isActive}`);
        }
      });
      if (undefinedActiveUsers.length > 10) {
        console.log(`    ... 他 ${undefinedActiveUsers.length - 10} 人`);
      }
    }

    console.log('\n=== 5. 管理画面クエリの詳細検証 ===');
    
    // { isActive: { $ne: false } } は以下のユーザーを含む:
    // - isActive: true
    // - isActive: undefined/null
    // - isActive フィールドが存在しない
    
    const includedByAdminQuery = await UserModel.find(adminQuery)
      .select('_id name email tokenBalance isActive')
      .lean();
    
    console.log('📋 管理画面クエリに含まれるユーザーのisActive分布:');
    const activeDistribution = {
      true: 0,
      false: 0,
      undefined: 0,
      null: 0
    };
    
    includedByAdminQuery.forEach(user => {
      if (user.isActive === true) activeDistribution.true++;
      else if (user.isActive === false) activeDistribution.false++;
      else if (user.isActive === null) activeDistribution.null++;
      else activeDistribution.undefined++;
    });
    
    console.log('  - isActive: true:', activeDistribution.true);
    console.log('  - isActive: false:', activeDistribution.false);
    console.log('  - isActive: null:', activeDistribution.null);
    console.log('  - isActive: undefined:', activeDistribution.undefined);

    console.log('\n=== 6. 結論 ===');
    
    if (tokenDifference === 0) {
      console.log('✅ トークン残高に差分はありません');
    } else {
      console.log('⚠️  トークン残高に差分があります');
      console.log('📝 原因:');
      if (explicitInactiveUsers.length > 0) {
        const explicitInactiveBalance = explicitInactiveUsers.reduce((sum, user) => sum + (user.tokenBalance || 0), 0);
        console.log(`  - 明示的に非アクティブなユーザー: ${explicitInactiveBalance.toLocaleString()} tokens`);
      }
      
      console.log('🔧 推奨対応:');
      console.log('  1. 管理画面とユーザー画面で同じクエリ条件を使用する');
      console.log('  2. または、それぞれの画面で何を表示すべきかを明確に定義する');
      console.log('  3. isActiveフィールドの一貫性を確保する');
    }

    await mongoose.disconnect();
    console.log('\n✅ 分析完了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// メイン実行
if (require.main === module) {
  analyzeTokenDifference();
}

module.exports = { analyzeTokenDifference };