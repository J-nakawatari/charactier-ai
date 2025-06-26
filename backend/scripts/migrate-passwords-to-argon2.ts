#!/usr/bin/env node

import mongoose from 'mongoose';
import { UserModel } from '../src/models/UserModel';
import { AdminModel } from '../src/models/AdminModel';
import { getHashInfo } from '../src/services/passwordHash';
import log from '../src/utils/logger';

/**
 * パスワードハッシュの統計情報を取得
 */
async function getPasswordStats() {
  const users = await UserModel.find({}).select('password');
  const admins = await AdminModel.find({}).select('password');
  
  const stats = {
    users: {
      total: users.length,
      bcrypt: 0,
      argon2: 0,
      unknown: 0
    },
    admins: {
      total: admins.length,
      bcrypt: 0,
      argon2: 0,
      unknown: 0
    }
  };
  
  // ユーザーの統計
  users.forEach(user => {
    const info = getHashInfo(user.password);
    if (info.algorithm === 'bcrypt') stats.users.bcrypt++;
    else if (info.algorithm === 'argon2id') stats.users.argon2++;
    else stats.users.unknown++;
  });
  
  // 管理者の統計
  admins.forEach(admin => {
    const info = getHashInfo(admin.password);
    if (info.algorithm === 'bcrypt') stats.admins.bcrypt++;
    else if (info.algorithm === 'argon2id') stats.admins.argon2++;
    else stats.admins.unknown++;
  });
  
  return stats;
}

/**
 * 移行ステータスの表示
 */
async function displayMigrationStatus() {
  console.log('\n=== パスワードハッシュ移行ステータス ===\n');
  
  const stats = await getPasswordStats();
  
  console.log('ユーザー:');
  console.log(`  総数: ${stats.users.total}`);
  console.log(`  bcrypt: ${stats.users.bcrypt} (${((stats.users.bcrypt / stats.users.total) * 100).toFixed(1)}%)`);
  console.log(`  argon2id: ${stats.users.argon2} (${((stats.users.argon2 / stats.users.total) * 100).toFixed(1)}%)`);
  console.log(`  不明: ${stats.users.unknown}`);
  
  console.log('\n管理者:');
  console.log(`  総数: ${stats.admins.total}`);
  console.log(`  bcrypt: ${stats.admins.bcrypt} (${((stats.admins.bcrypt / stats.admins.total) * 100).toFixed(1)}%)`);
  console.log(`  argon2id: ${stats.admins.argon2} (${((stats.admins.argon2 / stats.admins.total) * 100).toFixed(1)}%)`);
  console.log(`  不明: ${stats.admins.unknown}`);
  
  const totalBcrypt = stats.users.bcrypt + stats.admins.bcrypt;
  const totalArgon2 = stats.users.argon2 + stats.admins.argon2;
  const total = stats.users.total + stats.admins.total;
  
  console.log('\n合計:');
  console.log(`  移行済み: ${totalArgon2}/${total} (${((totalArgon2 / total) * 100).toFixed(1)}%)`);
  console.log(`  未移行: ${totalBcrypt}/${total} (${((totalBcrypt / total) * 100).toFixed(1)}%)`);
  
  return totalBcrypt;
}

async function main() {
  try {
    // MongoDB接続
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI環境変数が設定されていません');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDBに接続しました');
    
    // 移行ステータスを表示
    const bcryptCount = await displayMigrationStatus();
    
    if (bcryptCount === 0) {
      console.log('\n✅ すべてのパスワードがArgon2idに移行済みです！');
    } else {
      console.log('\n⚠️  移行について:');
      console.log('パスワードハッシュの移行は、ユーザーが次回ログインする際に自動的に行われます。');
      console.log('強制的な移行はセキュリティ上推奨されません。');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ MongoDBから切断しました');
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}