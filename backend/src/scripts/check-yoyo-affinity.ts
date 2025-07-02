#!/usr/bin/env npx ts-node

/**
 * YOYOユーザーのaffinityデータを詳細に確認
 */

import mongoose from 'mongoose';
import { UserModel } from '../models/UserModel';
import { CharacterModel } from '../models/CharacterModel';
import dotenv from 'dotenv';
import path from 'path';

// .envファイルの読み込み
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

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
  const user = await UserModel.findOne({ name: 'YOYO' })
    .select('_id name email affinities')
    .lean();
  
  if (!user) {
    console.error('❌ YOYOユーザーが見つかりません');
    process.exit(1);
  }
  
  console.log('👤 YOYOユーザーの情報:');
  console.log(`  ID: ${user._id}`);
  console.log(`  名前: ${user.name}`);
  console.log(`  affinities数: ${user.affinities?.length || 0}\n`);
  
  if (user.affinities && user.affinities.length > 0) {
    for (const affinity of user.affinities) {
      const character = await CharacterModel.findById(affinity.character)
        .select('name')
        .lean();
      
      console.log(`📊 キャラクター: ${character?.name?.ja || 'Unknown'} (ID: ${affinity.character})`);
      console.log(`  - emotionalState: ${affinity.emotionalState} ${affinity.emotionalState === 'excited' ? '✅' : '❌'}`);
      console.log(`  - level: ${affinity.level}`);
      console.log(`  - experience: ${affinity.experience}`);
      console.log(`  - relationshipType: ${affinity.relationshipType}`);
      console.log(`  - lastInteraction: ${affinity.lastInteraction}`);
      
      if (affinity.moodHistory && affinity.moodHistory.length > 0) {
        console.log(`  - 最新のムード履歴:`);
        const latest = affinity.moodHistory[affinity.moodHistory.length - 1];
        console.log(`    mood: ${latest.mood}, triggeredBy: ${latest.triggeredBy}, at: ${latest.createdAt}`);
      }
      
      console.log('');
    }
  }
  
  console.log('\n💡 このデータがAPIで正しく返されているか、ブラウザコンソールで確認してください。');
  console.log('   Chat API response: のログでmoodフィールドを確認');
  
  await mongoose.disconnect();
}

main().catch(console.error);