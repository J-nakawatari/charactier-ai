const mongoose = require('mongoose');
require('dotenv').config();

const { BadgeModel } = require('./src/models/BadgeModel');

async function seedBadges() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔍 MongoDB接続成功');
    
    // 既存のバッジをクリア
    await BadgeModel.deleteMany({});
    console.log('🗑️ 既存バッジデータをクリア');
    
    // デフォルトバッジデータ
    const defaultBadges = [
      {
        name: { ja: 'はじめの一歩', en: 'First Step' },
        description: { ja: '初回チャットを完了しました', en: 'Completed your first chat' },
        iconUrl: 'beginner_first_chat',
        type: 'beginner',
        condition: { type: 'chat_count', value: 1 },
        isActive: true
      },
      {
        name: { ja: 'おしゃべり好き', en: 'Chatty' },
        description: { ja: '10回のチャットを完了しました', en: 'Completed 10 chats' },
        iconUrl: 'chat_10_messages',
        type: 'chat',
        condition: { type: 'chat_count', value: 10 },
        isActive: true
      },
      {
        name: { ja: '会話マスター', en: 'Chat Master' },
        description: { ja: '100回のチャットを完了しました', en: 'Completed 100 chats' },
        iconUrl: 'chat_100_messages',
        type: 'chat',
        condition: { type: 'chat_count', value: 100 },
        isActive: true
      },
      {
        name: { ja: '親密度レベル10', en: 'Affinity Level 10' },
        description: { ja: 'キャラクターとの親密度がレベル10に達しました', en: 'Reached affinity level 10 with a character' },
        iconUrl: 'affinity_level_10',
        type: 'affinity',
        condition: { type: 'affinity_level', value: 10 },
        isActive: true
      },
      {
        name: { ja: '親密度レベル50', en: 'Affinity Level 50' },
        description: { ja: 'キャラクターとの親密度がレベル50に達しました', en: 'Reached affinity level 50 with a character' },
        iconUrl: 'affinity_level_50',
        type: 'affinity',
        condition: { type: 'affinity_level', value: 50 },
        isActive: true
      },
      {
        name: { ja: '常連さん', en: 'Regular' },
        description: { ja: '7日間連続でログインしました', en: 'Logged in for 7 consecutive days' },
        iconUrl: 'login_7_days',
        type: 'login',
        condition: { type: 'login_days', value: 7 },
        isActive: true
      },
      {
        name: { ja: '初回購入', en: 'First Purchase' },
        description: { ja: '初めてトークンを購入しました', en: 'Made your first token purchase' },
        iconUrl: 'purchase_first',
        type: 'special',
        condition: { type: 'purchase_count', value: 1 },
        isActive: true
      }
    ];
    
    // バッジを作成
    const createdBadges = await BadgeModel.insertMany(defaultBadges);
    console.log(`✅ ${createdBadges.length}個のバッジを作成しました:`);
    
    createdBadges.forEach(badge => {
      console.log(`  - ${badge.name.ja} (${badge.type})`);
    });
    
  } catch (error) {
    console.error('❌ バッジシードエラー:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedBadges();