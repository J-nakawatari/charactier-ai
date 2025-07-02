#!/usr/bin/env npx ts-node

/**
 * ユーザーのaffinityデータ（特にemotionalState）を確認するスクリプト
 * 
 * 使用方法:
 * - ユーザーIDで検索: npm run script check-user-affinity.ts -- --id <userId>
 * - メールアドレスで検索: npm run script check-user-affinity.ts -- --email <email>
 * - 全ユーザーのemotionalStateをサマリー表示: npm run script check-user-affinity.ts -- --summary
 */

import mongoose from 'mongoose';
import { UserModel } from '../models/UserModel';
import { CharacterModel } from '../models/CharacterModel';
import dotenv from 'dotenv';
import path from 'path';

// .envファイルの読み込み
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// コマンドライン引数の解析
const args = process.argv.slice(2);
let searchType = '';
let searchValue = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--id' && i + 1 < args.length) {
    searchType = 'id';
    searchValue = args[i + 1];
    i++;
  } else if (args[i] === '--email' && i + 1 < args.length) {
    searchType = 'email';
    searchValue = args[i + 1];
    i++;
  } else if (args[i] === '--summary') {
    searchType = 'summary';
  }
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

async function displayAffinityData(user: any) {
  console.log('=====================================');
  console.log(`👤 ユーザー情報`);
  console.log('=====================================');
  console.log(`ID: ${user._id}`);
  console.log(`名前: ${user.name}`);
  console.log(`メール: ${user.email}`);
  console.log(`登録日: ${user.registrationDate}`);
  console.log(`アカウントステータス: ${user.accountStatus}`);
  console.log(`親密度データ数: ${user.affinities?.length || 0}`);
  console.log('');

  if (!user.affinities || user.affinities.length === 0) {
    console.log('⚠️  このユーザーには親密度データがありません');
    return;
  }

  // 各キャラクターとの親密度データを表示
  for (const affinity of user.affinities) {
    const character = await CharacterModel.findById(affinity.character);
    
    console.log('-------------------------------------');
    console.log(`🎭 キャラクター: ${character ? character.name.ja : 'Unknown'} (ID: ${affinity.character})`);
    console.log('-------------------------------------');
    
    // 基本親密度情報
    console.log('\n📊 基本親密度情報:');
    console.log(`  レベル: ${affinity.level}/100`);
    console.log(`  経験値: ${affinity.experience}/${affinity.experienceToNext}`);
    console.log(`  関係性タイプ: ${affinity.relationshipType}`);
    console.log(`  信頼レベル: ${affinity.trustLevel}/100`);
    console.log(`  親密度レベル: ${affinity.intimacyLevel}/100`);
    
    // 感情状態（重要）
    console.log('\n💭 感情状態:');
    console.log(`  現在の感情: ${affinity.emotionalState} ⭐`);
    
    // 会話統計
    console.log('\n💬 会話統計:');
    console.log(`  総会話数: ${affinity.totalConversations}`);
    console.log(`  総メッセージ数: ${affinity.totalMessages}`);
    console.log(`  平均応答時間: ${affinity.averageResponseTime}ms`);
    console.log(`  最終インタラクション: ${affinity.lastInteraction || 'なし'}`);
    
    // ストリーク情報
    console.log('\n🔥 ストリーク情報:');
    console.log(`  現在のストリーク: ${affinity.currentStreak}日`);
    console.log(`  最大ストリーク: ${affinity.maxStreak}日`);
    console.log(`  連続日数: ${affinity.consecutiveDays}日`);
    
    // 個性・記憶
    if (affinity.favoriteTopics?.length > 0) {
      console.log('\n📝 お気に入りのトピック:', affinity.favoriteTopics.join(', '));
    }
    if (affinity.specialMemories?.length > 0) {
      console.log('💝 特別な思い出:', affinity.specialMemories.join(', '));
    }
    if (affinity.personalNotes) {
      console.log('📄 個人メモ:', affinity.personalNotes);
    }
    
    // ギフト情報
    if (affinity.giftsReceived?.length > 0) {
      console.log(`\n🎁 受け取ったギフト数: ${affinity.giftsReceived.length}`);
      console.log(`  総ギフト価値: ${affinity.totalGiftsValue}`);
      
      // 最新3つのギフトを表示
      const recentGifts = affinity.giftsReceived.slice(-3);
      recentGifts.forEach((gift: any, index: number) => {
        console.log(`  ${index + 1}. ${gift.giftName} (${gift.rarity}) - ${gift.sentAt}`);
      });
    }
    
    // 解放済み報酬
    if (affinity.unlockedImages?.length > 0) {
      console.log(`\n🖼️  解放済み画像数: ${affinity.unlockedImages.length}`);
      console.log(`  次の報酬レベル: ${affinity.nextRewardLevel}`);
      console.log(`  次の解放レベル: ${affinity.nextUnlockLevel}`);
    }
    
    // ムード履歴（最新5件）
    if (affinity.moodHistory?.length > 0) {
      console.log('\n😊 ムード履歴（最新5件）:');
      const recentMoods = affinity.moodHistory.slice(-5);
      recentMoods.forEach((mood: any, index: number) => {
        console.log(`  ${index + 1}. ${mood.mood} (強度: ${mood.intensity}/10) - トリガー: ${mood.triggeredBy} - ${mood.createdAt}`);
      });
    }
    
    // 現在のムード修飾子
    if (affinity.currentMoodModifiers?.length > 0) {
      console.log('\n✨ 現在のムード修飾子:');
      affinity.currentMoodModifiers.forEach((modifier: any) => {
        console.log(`  - ${modifier.type} (強度: ${modifier.strength}) - 期限: ${modifier.expiresAt}`);
      });
    }
    
    console.log('\n');
  }
}

async function displaySummary() {
  console.log('=====================================');
  console.log('📊 全ユーザーのemotionalStateサマリー');
  console.log('=====================================\n');

  // 全ユーザーを取得（affinitiesフィールドを含む）
  const users = await UserModel.find({ 'affinities.0': { $exists: true } });
  
  const emotionalStateCounts: Record<string, number> = {
    happy: 0,
    excited: 0,
    calm: 0,
    sad: 0,
    angry: 0,
    neutral: 0,
    melancholic: 0
  };
  
  let totalAffinities = 0;
  const userEmotionalStates: Array<{userId: string, userName: string, email: string, states: string[]}> = [];

  for (const user of users) {
    const states: string[] = [];
    
    for (const affinity of user.affinities || []) {
      totalAffinities++;
      const state = affinity.emotionalState || 'neutral';
      emotionalStateCounts[state] = (emotionalStateCounts[state] || 0) + 1;
      states.push(state);
    }
    
    if (states.length > 0) {
      userEmotionalStates.push({
        userId: user._id.toString(),
        userName: user.name || 'Unknown',
        email: user.email,
        states: states
      });
    }
  }

  // サマリー表示
  console.log(`総ユーザー数: ${users.length}`);
  console.log(`総親密度データ数: ${totalAffinities}\n`);
  
  console.log('感情状態の分布:');
  console.log('------------------------');
  for (const [state, count] of Object.entries(emotionalStateCounts)) {
    const percentage = totalAffinities > 0 ? ((count / totalAffinities) * 100).toFixed(1) : '0.0';
    const emoji = getEmotionalStateEmoji(state);
    console.log(`${emoji} ${state.padEnd(12)} : ${count.toString().padStart(4)} (${percentage}%)`);
  }
  
  // neutral以外の感情を持つユーザーを表示
  console.log('\n\n特殊な感情状態を持つユーザー:');
  console.log('================================');
  
  userEmotionalStates.forEach(userData => {
    const nonNeutralStates = userData.states.filter(s => s !== 'neutral');
    if (nonNeutralStates.length > 0) {
      console.log(`\n👤 ${userData.userName} (${userData.email})`);
      console.log(`   ID: ${userData.userId}`);
      console.log(`   感情状態: ${nonNeutralStates.map(s => `${getEmotionalStateEmoji(s)} ${s}`).join(', ')}`);
    }
  });
}

function getEmotionalStateEmoji(state: string): string {
  const emojiMap: Record<string, string> = {
    happy: '😊',
    excited: '🤩',
    calm: '😌',
    sad: '😢',
    angry: '😠',
    neutral: '😐',
    melancholic: '😔'
  };
  return emojiMap[state] || '❓';
}

async function main() {
  try {
    await connectDB();

    if (!searchType) {
      console.log('使用方法:');
      console.log('  ユーザーIDで検索: npm run script check-user-affinity.ts -- --id <userId>');
      console.log('  メールアドレスで検索: npm run script check-user-affinity.ts -- --email <email>');
      console.log('  全ユーザーのサマリー: npm run script check-user-affinity.ts -- --summary');
      process.exit(1);
    }

    if (searchType === 'summary') {
      await displaySummary();
    } else {
      let user;
      
      if (searchType === 'id') {
        user = await UserModel.findById(searchValue);
      } else if (searchType === 'email') {
        user = await UserModel.findOne({ email: searchValue.toLowerCase() });
      }
      
      if (!user) {
        console.log(`❌ ユーザーが見つかりません (${searchType}: ${searchValue})`);
        process.exit(1);
      }
      
      await displayAffinityData(user);
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ MongoDBから切断しました');
  }
}

// スクリプトの実行
main();