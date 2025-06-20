#!/usr/bin/env node

/**
 * 🔧 キャラクターバリデーション確認スクリプト
 * 
 * 目的: DBに保存されているキャラクターの必須フィールド不足を確認
 * 対象: すべてのキャラクターのバリデーション状態
 */

const mongoose = require('mongoose');
require('dotenv').config();

// CharacterModelの簡略版定義（バリデーション確認用）
const CharacterSchema = new mongoose.Schema({
  name: {
    ja: { type: String, required: true },
    en: { type: String, required: true }
  },
  description: {
    ja: { type: String, required: true },
    en: { type: String, required: true }
  },
  aiModel: {
    type: String,
    enum: ['gpt-3.5-turbo', 'gpt-4o-mini', 'o4-mini'],
    required: true
  },
  characterAccessType: {
    type: String,
    enum: ['free', 'purchaseOnly'],
    required: true
  },
  personalityPreset: {
    type: String,
    enum: ['おっとり系', '元気系', 'クール系', '真面目系', 'セクシー系', '天然系', 'ボーイッシュ系', 'お姉さん系', 'ツンデレ'],
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'neutral'],
    required: true
  },
  personalityPrompt: {
    ja: { type: String, required: true },
    en: { type: String, required: true }
  },
  adminPrompt: {
    ja: { type: String, required: true },
    en: { type: String, required: true }
  },
  defaultMessage: {
    ja: { type: String, required: true },
    en: { type: String, required: true }
  },
  limitMessage: {
    ja: { type: String, required: true },
    en: { type: String, required: true }
  },
  affinitySettings: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  versionKey: false
});

const CharacterModel = mongoose.model('Character', CharacterSchema);

async function validateCharacters() {
  try {
    console.log('🔍 MongoDB接続中...');
    
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('MONGO_URI環境変数が設定されていません');
    }
    console.log('🔗 接続先: MongoDB Atlas (認証情報は非表示)');
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB接続成功');

    // 1. 全キャラクターを取得
    console.log('\n📊 キャラクターバリデーション開始...');
    const characters = await CharacterModel.find({}).lean();
    console.log(`🔍 発見したキャラクター: ${characters.length}件`);

    const validationErrors = [];
    const missingFields = {};

    // 2. 各キャラクターのバリデーション
    for (let i = 0; i < characters.length; i++) {
      const character = characters[i];
      const errors = [];
      
      // 必須フィールドのチェック
      const requiredFields = [
        { path: 'name.ja', value: character.name?.ja },
        { path: 'name.en', value: character.name?.en },
        { path: 'description.ja', value: character.description?.ja },
        { path: 'description.en', value: character.description?.en },
        { path: 'aiModel', value: character.aiModel },
        { path: 'characterAccessType', value: character.characterAccessType },
        { path: 'personalityPreset', value: character.personalityPreset },
        { path: 'gender', value: character.gender },
        { path: 'personalityPrompt.ja', value: character.personalityPrompt?.ja },
        { path: 'personalityPrompt.en', value: character.personalityPrompt?.en },
        { path: 'adminPrompt.ja', value: character.adminPrompt?.ja },
        { path: 'adminPrompt.en', value: character.adminPrompt?.en },
        { path: 'defaultMessage.ja', value: character.defaultMessage?.ja },
        { path: 'defaultMessage.en', value: character.defaultMessage?.en },
        { path: 'limitMessage.ja', value: character.limitMessage?.ja },
        { path: 'limitMessage.en', value: character.limitMessage?.en },
        { path: 'affinitySettings', value: character.affinitySettings }
      ];

      requiredFields.forEach(field => {
        if (!field.value || (typeof field.value === 'string' && field.value.trim() === '')) {
          errors.push(field.path);
          missingFields[field.path] = (missingFields[field.path] || 0) + 1;
        }
      });

      if (errors.length > 0) {
        validationErrors.push({
          id: character._id,
          name: character.name?.ja || character.name?.en || 'Unknown',
          errors: errors,
          isActive: character.isActive
        });
      }
    }

    // 3. 結果表示
    console.log(`\n📋 バリデーション結果:`);
    console.log(`   ✅ 正常なキャラクター: ${characters.length - validationErrors.length}件`);
    console.log(`   ❌ エラーのあるキャラクター: ${validationErrors.length}件`);

    if (validationErrors.length > 0) {
      console.log('\n❌ エラー詳細:');
      validationErrors.forEach((char, index) => {
        console.log(`\n${index + 1}. キャラクター: ${char.name} (ID: ${char.id})`);
        console.log(`   Active: ${char.isActive}`);
        console.log(`   不足フィールド: ${char.errors.join(', ')}`);
      });

      console.log('\n📊 不足フィールド統計:');
      Object.entries(missingFields)
        .sort(([,a], [,b]) => b - a)
        .forEach(([field, count]) => {
          console.log(`   ${field}: ${count}件`);
        });
    }

    // 4. 修正提案
    if (validationErrors.length > 0) {
      console.log('\n💡 修正提案:');
      console.log('   1. 不足している必須フィールドにデフォルト値を設定');
      console.log('   2. 既存データの手動修正');
      console.log('   3. バリデーションエラーの原因となるキャラクターの一時無効化');
    }

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
  validateCharacters();
}

module.exports = { validateCharacters };