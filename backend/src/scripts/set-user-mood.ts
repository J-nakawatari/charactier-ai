#!/usr/bin/env npx ts-node

/**
 * 特定のユーザーのemotionalStateを設定するスクリプト
 * 
 * 使用方法:
 * npx tsx src/scripts/set-user-mood.ts <email> <characterId> <mood>
 * 
 * 例:
 * npx tsx src/scripts/set-user-mood.ts user@example.com 1234567890abcdef excited
 */

import mongoose from 'mongoose';
import { UserModel } from '../models/UserModel';
import dotenv from 'dotenv';
import path from 'path';

// .envファイルの読み込み
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// コマンドライン引数の解析
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('使用方法: npx tsx src/scripts/set-user-mood.ts <email> <characterId> <mood>');
  console.error('利用可能なmood: happy, excited, calm, sad, angry, neutral, melancholic');
  process.exit(1);
}

const [email, characterId, mood] = args;

// 有効なmoodかチェック
const validMoods = ['happy', 'excited', 'calm', 'sad', 'angry', 'neutral', 'melancholic'];
if (!validMoods.includes(mood)) {
  console.error(`❌ 無効なmood: ${mood}`);
  console.error(`利用可能なmood: ${validMoods.join(', ')}`);
  process.exit(1);
}

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

async function updateUserMood() {
  try {
    // ユーザーを検索
    const user = await UserModel.findOne({ email });
    
    if (!user) {
      console.error(`❌ ユーザーが見つかりません: ${email}`);
      process.exit(1);
    }

    console.log(`👤 ユーザー: ${email} (${user.name})`);
    
    // 指定されたキャラクターのaffinityを探す
    const affinityIndex = user.affinities.findIndex(
      aff => aff.character.toString() === characterId
    );
    
    if (affinityIndex === -1) {
      console.error(`❌ キャラクター ${characterId} との親密度データが見つかりません`);
      
      // 利用可能なキャラクターを表示
      console.log('\n利用可能なキャラクター:');
      user.affinities.forEach(aff => {
        console.log(`  - ${aff.character} (現在のmood: ${aff.emotionalState})`);
      });
      process.exit(1);
    }
    
    const oldMood = user.affinities[affinityIndex].emotionalState;
    
    // emotionalStateを更新
    user.affinities[affinityIndex].emotionalState = mood as any;
    
    // 保存
    await user.save();
    
    console.log(`\n✅ emotionalStateを更新しました:`);
    console.log(`  ${oldMood} → ${mood}`);
    console.log(`  レベル: ${user.affinities[affinityIndex].level}`);
    
    // moodEngineのログも追加
    user.affinities[affinityIndex].moodHistory.push({
      mood,
      intensity: 10,
      triggeredBy: 'manual_debug_update',
      duration: 60,
      createdAt: new Date()
    });
    
    await user.save();
    console.log(`  ムード履歴も更新しました`);

  } catch (error) {
    console.error('❌ 更新エラー:', error);
    process.exit(1);
  }
}

async function main() {
  await connectDB();
  await updateUserMood();
  await mongoose.disconnect();
  console.log('\n✅ 完了しました');
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  process.exit(1);
});

// スクリプトの実行
main().catch(console.error);