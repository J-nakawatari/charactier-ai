#!/usr/bin/env npx ts-node

/**
 * 既存のaffinityデータにemotionalStateフィールドを追加するマイグレーションスクリプト
 * 
 * 使用方法:
 * cd backend && npx tsx src/scripts/migrate-emotional-state.ts
 */

import mongoose from 'mongoose';
import { UserModel } from '../models/UserModel';
import dotenv from 'dotenv';
import path from 'path';

// .envファイルの読み込み（複数のパスを試す）
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

async function migrateEmotionalState() {
  try {
    console.log('🔄 emotionalStateフィールドのマイグレーションを開始します...\n');

    // emotionalStateフィールドがないaffinityを持つユーザーを検索
    const users = await UserModel.find({
      'affinities.0': { $exists: true }
    });

    console.log(`📊 総ユーザー数: ${users.length}`);

    let migratedCount = 0;
    let affinityCount = 0;

    for (const user of users) {
      let userUpdated = false;

      for (let i = 0; i < user.affinities.length; i++) {
        const affinity = user.affinities[i];
        
        // emotionalStateがundefinedまたはnullの場合
        if (!affinity.emotionalState) {
          // レベルに基づいて初期感情を設定
          let initialMood = 'neutral';
          
          if (affinity.level >= 60) {
            initialMood = 'happy';  // 高レベルユーザーはhappy
          } else if (affinity.level >= 30) {
            initialMood = 'excited';  // 中レベルユーザーはexcited
          } else if (affinity.level >= 10) {
            initialMood = 'calm';  // 低レベルユーザーはcalm
          }
          
          // TypeScript型を正しく設定
          affinity.emotionalState = initialMood as 'happy' | 'excited' | 'calm' | 'sad' | 'angry' | 'neutral' | 'melancholic';
          userUpdated = true;
          affinityCount++;
          
          console.log(`  ✅ ユーザー ${user.email} のキャラクター ${affinity.character} に emotionalState: ${initialMood} を設定 (レベル: ${affinity.level})`);
        }
      }

      if (userUpdated) {
        await user.save();
        migratedCount++;
      }
    }

    console.log('\n🎉 マイグレーション完了!');
    console.log(`  - 更新されたユーザー数: ${migratedCount}`);
    console.log(`  - 更新されたaffinity数: ${affinityCount}`);

  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    process.exit(1);
  }
}

async function main() {
  await connectDB();
  await migrateEmotionalState();
  
  console.log('\n📊 マイグレーション後の統計:');
  
  // 統計情報の表示
  const stats = await UserModel.aggregate([
    { $unwind: '$affinities' },
    {
      $group: {
        _id: '$affinities.emotionalState',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  console.log('\nemotionalStateの分布:');
  stats.forEach(stat => {
    const emoji = {
      happy: '😊',
      excited: '🤩',
      calm: '😌',
      sad: '😢',
      angry: '😠',
      neutral: '😐',
      melancholic: '😔'
    }[stat._id] || '❓';
    
    console.log(`  ${emoji} ${stat._id}: ${stat.count}件`);
  });

  await mongoose.disconnect();
  console.log('\n✅ 接続を終了しました');
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  process.exit(1);
});

// スクリプトの実行
main().catch(console.error);