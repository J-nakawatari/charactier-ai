#!/usr/bin/env npx ts-node

/**
 * YOYOユーザーに指定キャラクターのaffinityデータを作成
 */

import mongoose from 'mongoose';
import { UserModel } from '../models/UserModel';
import dotenv from 'dotenv';
import path from 'path';

// .envファイルの読み込み
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const TARGET_CHARACTER_ID = '685913353428f47f2088e2ba';

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
  
  // YOYOユーザーを検索
  const user = await UserModel.findOne({ name: 'YOYO' });
  
  if (!user) {
    console.error('❌ YOYOユーザーが見つかりません');
    process.exit(1);
  }
  
  console.log(`👤 YOYOユーザー (${user.email}) にaffinityデータを作成します...`);
  
  // 既存のaffinityをチェック
  const existingAffinity = user.affinities.find(
    aff => aff.character.toString() === TARGET_CHARACTER_ID
  );
  
  if (existingAffinity) {
    console.log('⚠️  既にaffinityデータが存在します');
    console.log(`  emotionalState: ${existingAffinity.emotionalState}`);
    console.log(`  level: ${existingAffinity.level}`);
  } else {
    // 新しいaffinityを作成
    user.affinities.push({
      character: TARGET_CHARACTER_ID,
      level: 10,
      experience: 100,
      experienceToNext: 10,
      emotionalState: 'excited', // わくわく！
      relationshipType: 'acquaintance',
      trustLevel: 10,
      intimacyLevel: 10,
      totalConversations: 1,
      totalMessages: 1,
      averageResponseTime: 0,
      lastInteraction: new Date(),
      currentStreak: 1,
      maxStreak: 1,
      consecutiveDays: 1,
      favoriteTopics: [],
      specialMemories: [],
      personalNotes: '',
      giftsReceived: [],
      totalGiftsValue: 0,
      unlockedRewards: [],
      unlockedImages: [],
      nextRewardLevel: 20,
      nextUnlockLevel: 20,
      moodHistory: [{
        mood: 'excited',
        intensity: 10,
        triggeredBy: 'initial_creation',
        duration: 120,
        createdAt: new Date()
      }],
      currentMoodModifiers: [{
        type: 'excited',
        strength: 1.0,
        expiresAt: new Date(Date.now() + 120 * 60 * 1000) // 2時間後
      }]
    } as any);
    
    await user.save();
    
    console.log('✅ 新しいaffinityデータを作成しました!');
    console.log('  emotionalState: excited 🤩');
    console.log('  level: 10');
    console.log('  キャラクターID:', TARGET_CHARACTER_ID);
  }
  
  await mongoose.disconnect();
  console.log('\n🎉 完了! ページをリロードして確認してください。');
}

main().catch(console.error);