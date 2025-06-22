#!/usr/bin/env node

/**
 * 🔧 キャラクターバリデーション修正スクリプト
 * 
 * 目的: 不足している必須フィールドにデフォルト値を設定
 * 対象: ミサキ、リンの9個の必須フィールド
 * 
 * 安全性: 既存データは保持し、不足部分のみ追加
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixCharacterValidation() {
  try {
    console.log('🔍 MongoDB接続中...');
    
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('MONGO_URI環境変数が設定されていません');
    }
    console.log('🔗 接続先: MongoDB Atlas (認証情報は非表示)');
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB接続成功');

    // 修正対象のキャラクターを特定
    const targetCharacterIds = [
      '6844bc05fbdd34d06156f234', // ミサキ
      '6844bc05fbdd34d06156f235'  // リン
    ];

    console.log('\n🔧 キャラクターバリデーション修正開始...');
    
    for (const characterId of targetCharacterIds) {
      console.log(`\n📝 キャラクター ${characterId} の修正中...`);
      
      // 現在のキャラクターデータを取得
      const character = await mongoose.connection.db.collection('characters').findOne({
        _id: new mongoose.Types.ObjectId(characterId)
      });
      
      if (!character) {
        console.log(`⚠️  キャラクター ${characterId} が見つかりません`);
        continue;
      }
      
      console.log(`   キャラクター名: ${character.name?.ja || 'Unknown'}`);
      
      // デフォルト値の設定
      const defaultPersonalityPrompt = {
        ja: `あなたは${character.name?.ja || 'キャラクター'}です。${character.description?.ja || '優しく話しかけてください'}。`,
        en: `You are ${character.name?.en || 'Character'}. ${character.description?.en || 'Please speak kindly'}.`
      };
      
      const defaultAdminPrompt = {
        ja: '管理者用のプロンプトです。適切な応答を心がけてください。',
        en: 'This is an admin prompt. Please provide appropriate responses.'
      };
      
      const defaultDefaultMessage = {
        ja: 'こんにちは！何かお話ししませんか？',
        en: 'Hello! Shall we have a chat?'
      };
      
      const defaultLimitMessage = {
        ja: 'トークンが不足しています。チャージしてから続けてください。',
        en: 'Insufficient tokens. Please recharge to continue.'
      };
      
      const defaultAffinitySettings = {
        maxLevel: 100,
        experienceMultiplier: 1.0,
        decayRate: 0.1,
        decayThreshold: 7,
        levelUpBonuses: []
      };
      
      // 更新データの準備（既存データは保持）
      const updateData = {};
      
      if (!character.personalityPrompt?.ja || !character.personalityPrompt?.en) {
        updateData.personalityPrompt = defaultPersonalityPrompt;
      }
      
      if (!character.adminPrompt?.ja || !character.adminPrompt?.en) {
        updateData.adminPrompt = defaultAdminPrompt;
      }
      
      if (!character.defaultMessage?.ja || !character.defaultMessage?.en) {
        updateData.defaultMessage = defaultDefaultMessage;
      }
      
      if (!character.limitMessage?.ja || !character.limitMessage?.en) {
        updateData.limitMessage = defaultLimitMessage;
      }
      
      if (!character.affinitySettings) {
        updateData.affinitySettings = defaultAffinitySettings;
      }
      
      if (Object.keys(updateData).length > 0) {
        // データベース更新
        const result = await mongoose.connection.db.collection('characters').updateOne(
          { _id: new mongoose.Types.ObjectId(characterId) },
          { 
            $set: updateData,
            $currentDate: { updatedAt: true }
          }
        );
        
        console.log(`   ✅ 更新完了: ${Object.keys(updateData).length}個のフィールドを追加`);
        console.log(`   更新されたフィールド: ${Object.keys(updateData).join(', ')}`);
      } else {
        console.log(`   ℹ️  更新不要: すべての必須フィールドが存在`);
      }
    }

    // 修正後の検証
    console.log('\n🔍 修正後の検証...');
    for (const characterId of targetCharacterIds) {
      const character = await mongoose.connection.db.collection('characters').findOne({
        _id: new mongoose.Types.ObjectId(characterId)
      });
      
      const missingFields = [];
      
      if (!character.personalityPrompt?.ja) missingFields.push('personalityPrompt.ja');
      if (!character.personalityPrompt?.en) missingFields.push('personalityPrompt.en');
      if (!character.adminPrompt?.ja) missingFields.push('adminPrompt.ja');
      if (!character.adminPrompt?.en) missingFields.push('adminPrompt.en');
      if (!character.defaultMessage?.ja) missingFields.push('defaultMessage.ja');
      if (!character.defaultMessage?.en) missingFields.push('defaultMessage.en');
      if (!character.limitMessage?.ja) missingFields.push('limitMessage.ja');
      if (!character.limitMessage?.en) missingFields.push('limitMessage.en');
      if (!character.affinitySettings) missingFields.push('affinitySettings');
      
      if (missingFields.length === 0) {
        console.log(`   ✅ ${character.name?.ja}: すべての必須フィールドが存在`);
      } else {
        console.log(`   ❌ ${character.name?.ja}: まだ不足: ${missingFields.join(', ')}`);
      }
    }

    console.log('\n✅ キャラクターバリデーション修正完了');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 MongoDB接続を閉じました');
  }
}

// 直接実行の場合
if (require.main === module) {
  fixCharacterValidation();
}

module.exports = { fixCharacterValidation };