#!/usr/bin/env npx ts-node

/**
 * 全ユーザーの特定キャラクター（685913353428f47f2088e2ba）のムードをexcitedに設定
 */

import mongoose from 'mongoose';
import { UserModel } from '../models/UserModel';
import dotenv from 'dotenv';
import path from 'path';

// .envファイルの読み込み
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const TARGET_CHARACTER_ID = '685913353428f47f2088e2ba';
const TARGET_MOOD = 'excited';

async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI環境変数が設定されていません');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDBに接続しました\n');
  } catch (error) {
    console.error('❌ MongoDB接続エラー:', error);
    process.exit(1);
  }
}

async function main() {
  await connectDB();
  
  console.log(`🎯 キャラクター ${TARGET_CHARACTER_ID} のムードを ${TARGET_MOOD} に更新します...\n`);
  
  // 該当するaffinityを持つユーザーを検索
  const users = await UserModel.find({
    'affinities.character': TARGET_CHARACTER_ID
  });
  
  console.log(`📊 対象ユーザー数: ${users.length}`);
  
  let updatedCount = 0;
  
  for (const user of users) {
    const affinityIndex = user.affinities.findIndex(
      aff => aff.character.toString() === TARGET_CHARACTER_ID
    );
    
    if (affinityIndex !== -1) {
      const oldMood = user.affinities[affinityIndex].emotionalState;
      user.affinities[affinityIndex].emotionalState = TARGET_MOOD as any;
      
      // ムード履歴も追加
      if (!user.affinities[affinityIndex].moodHistory) {
        user.affinities[affinityIndex].moodHistory = [];
      }
      
      user.affinities[affinityIndex].moodHistory.push({
        mood: TARGET_MOOD,
        intensity: 10,
        triggeredBy: 'force_update_debug',
        duration: 120,
        createdAt: new Date()
      });
      
      await user.save();
      updatedCount++;
      
      console.log(`  ✅ ユーザー ${user.name} のムードを更新: ${oldMood} → ${TARGET_MOOD}`);
    }
  }
  
  console.log(`\n🎉 完了! ${updatedCount}件のユーザーを更新しました`);
  
  await mongoose.disconnect();
}

main().catch(console.error);