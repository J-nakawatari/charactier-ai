#!/usr/bin/env npx ts-node

/**
 * ユーザーとキャラクターの関係を簡潔に表示するスクリプト
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
  
  // アクティブなユーザーを取得
  const users = await UserModel.find({ 
    accountStatus: { $in: ['active', undefined] },
    'affinities.0': { $exists: true }
  })
  .select('email name affinities')
  .lean();
  
  console.log(`📊 アクティブユーザー数: ${users.length}\n`);
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`${i + 1}. メール: ***@***.*** (${user.name || '名前未設定'})`);
    
    for (const affinity of user.affinities) {
      // キャラクター情報を取得
      const character = await CharacterModel.findById(affinity.character)
        .select('name')
        .lean();
      
      if (character) {
        const moodEmoji = {
          happy: '😊',
          excited: '🤩',
          calm: '😌',
          sad: '😢',
          angry: '😠',
          neutral: '😐',
          melancholic: '😔'
        }[affinity.emotionalState] || '❓';
        
        console.log(`   - キャラクター: ${character.name.ja} (ID: ${affinity.character})`);
        console.log(`     mood: ${moodEmoji} ${affinity.emotionalState} | レベル: ${affinity.level}`);
      }
    }
    console.log('');
  }
  
  console.log('\n💡 ムードを変更するには:');
  console.log('npx tsx src/scripts/set-user-mood.ts <email> <characterId> <mood>');
  console.log('例: npx tsx src/scripts/set-user-mood.ts ***@***.*** 12345... excited');
  
  await mongoose.disconnect();
}

main().catch(console.error);