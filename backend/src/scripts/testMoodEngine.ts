import { applyMoodTrigger, getCurrentMood, cleanupExpiredMoodModifiers } from '../services/moodEngine';
import { UserModel } from '../models/UserModel';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MoodEngineの動作をテストするスクリプト
 */
async function testMoodEngine() {
  try {
    console.log('🎭 Starting MoodEngine Test...');

    // MongoDB接続
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not set');
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // テスト用のユーザーIDとキャラクターID
    const testUserId = '676094c1b0de862d44c5ff48'; // 既存のユーザーIDに変更
    const testCharacterId = '675fc6e16e8ddc54b1b39eec'; // 既存のキャラクターIDに変更

    console.log('🧪 Testing with:', { testUserId, testCharacterId });

    // 1. 初期状態確認
    console.log('\n1. 🔍 Initial mood state:');
    const initialMood = await getCurrentMood(testUserId, testCharacterId);
    console.log('Initial mood:', initialMood);

    // 2. GIFTトリガーテスト
    console.log('\n2. 🎁 Testing GIFT trigger (1000 yen):');
    await applyMoodTrigger(testUserId, testCharacterId, {
      kind: 'GIFT',
      value: 1000
    });
    
    let currentMood = await getCurrentMood(testUserId, testCharacterId);
    console.log('Mood after gift:', currentMood);

    // 3. LEVEL_UPトリガーテスト
    console.log('\n3. 📈 Testing LEVEL_UP trigger (level 5):');
    await applyMoodTrigger(testUserId, testCharacterId, {
      kind: 'LEVEL_UP',
      newLevel: 5
    });
    
    currentMood = await getCurrentMood(testUserId, testCharacterId);
    console.log('Mood after level up:', currentMood);

    // 4. USER_SENTIMENTトリガーテスト（ネガティブ）
    console.log('\n4. 😞 Testing negative USER_SENTIMENT trigger:');
    await applyMoodTrigger(testUserId, testCharacterId, {
      kind: 'USER_SENTIMENT',
      sentiment: 'neg'
    });
    
    currentMood = await getCurrentMood(testUserId, testCharacterId);
    console.log('Mood after negative sentiment:', currentMood);

    // 5. INACTIVITYトリガーテスト
    console.log('\n5. 😔 Testing INACTIVITY trigger (10 days):');
    await applyMoodTrigger(testUserId, testCharacterId, {
      kind: 'INACTIVITY',
      days: 10
    });
    
    currentMood = await getCurrentMood(testUserId, testCharacterId);
    console.log('Mood after inactivity:', currentMood);

    // 6. ユーザーの詳細状態確認
    console.log('\n6. 📊 Detailed user state:');
    const user = await UserModel.findById(testUserId);
    if (user) {
      const affinity = user.affinities.find(
        aff => aff.character.toString() === testCharacterId
      );
      
      if (affinity) {
        console.log('Emotional state:', affinity.emotionalState);
        console.log('Current mood modifiers:', affinity.currentMoodModifiers.length);
        console.log('Mood history entries:', affinity.moodHistory.length);
        
        // 最新の履歴を表示
        if (affinity.moodHistory.length > 0) {
          const latestHistory = affinity.moodHistory.slice(-3);
          console.log('Latest mood history:');
          latestHistory.forEach((entry, index) => {
            console.log(`  ${index + 1}. ${entry.mood} (${entry.intensity}) - ${entry.triggeredBy}`);
          });
        }
        
        // アクティブなmodifierを表示
        if (affinity.currentMoodModifiers.length > 0) {
          console.log('Active mood modifiers:');
          affinity.currentMoodModifiers.forEach((modifier, index) => {
            console.log(`  ${index + 1}. ${modifier.type} (${modifier.strength}) - expires: ${modifier.expiresAt}`);
          });
        }
      }
    }

    // 7. クリーンアップテスト
    console.log('\n7. 🧹 Testing mood modifier cleanup:');
    await cleanupExpiredMoodModifiers(testUserId);
    console.log('Cleanup completed');

    console.log('\n✅ MoodEngine test completed successfully!');

  } catch (error) {
    console.error('❌ MoodEngine test failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('📋 MongoDB disconnected');
  }
}

// スクリプトが直接実行された場合のみテストを実行
if (require.main === module) {
  testMoodEngine().catch(console.error);
}

export { testMoodEngine };