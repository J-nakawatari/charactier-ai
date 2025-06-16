#!/usr/bin/env node

/**
 * キャラクター画像反映問題のデバッグスクリプト
 * 
 * 使用方法:
 * node debug-character-images.js [characterId]
 */

const mongoose = require('mongoose');
require('dotenv').config();

// CharacterModelの簡単な定義
const CharacterSchema = new mongoose.Schema({
  name: {
    ja: String,
    en: String
  },
  imageCharacterSelect: String,
  imageDashboard: String,
  imageChatBackground: String,
  imageChatAvatar: String,
  isActive: Boolean
}, { timestamps: true });

const Character = mongoose.model('Character', CharacterSchema);

async function debugCharacterImages(characterId) {
  try {
    console.log('🔍 MongoDB接続中...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB接続成功');

    if (characterId) {
      // 特定のキャラクターの画像情報を表示
      const character = await Character.findById(characterId);
      if (!character) {
        console.error('❌ キャラクターが見つかりません:', characterId);
        return;
      }

      console.log('\n🎭 キャラクター画像情報:');
      console.log('Name:', character.name?.ja || 'N/A');
      console.log('ID:', character._id);
      console.log('imageCharacterSelect:', character.imageCharacterSelect || 'NULL');
      console.log('imageDashboard:', character.imageDashboard || 'NULL');
      console.log('imageChatBackground:', character.imageChatBackground || 'NULL');
      console.log('imageChatAvatar:', character.imageChatAvatar || 'NULL');
      console.log('isActive:', character.isActive);
      console.log('updatedAt:', character.updatedAt);
      
      // URLの正規化状況をチェック
      console.log('\n🔗 URL正規化チェック:');
      [
        { field: 'imageCharacterSelect', url: character.imageCharacterSelect },
        { field: 'imageDashboard', url: character.imageDashboard },
        { field: 'imageChatBackground', url: character.imageChatBackground },
        { field: 'imageChatAvatar', url: character.imageChatAvatar }
      ].forEach(({ field, url }) => {
        if (url) {
          const isAbsolute = url.startsWith('http://') || url.startsWith('https://');
          const isUploads = url.startsWith('/uploads/') || url.startsWith('uploads/');
          console.log(`  ${field}: ${isAbsolute ? '絶対URL' : isUploads ? 'uploads相対' : '他の相対'}`, url);
        } else {
          console.log(`  ${field}: 未設定`);
        }
      });
    } else {
      // 全キャラクターの簡易情報を表示
      const characters = await Character.find({ isActive: true })
        .select('name imageCharacterSelect imageDashboard imageChatBackground imageChatAvatar updatedAt')
        .sort({ updatedAt: -1 })
        .limit(10);

      console.log('\n🎭 アクティブキャラクター一覧（最新10件）:');
      characters.forEach((char, index) => {
        const imageCount = [
          char.imageCharacterSelect,
          char.imageDashboard,
          char.imageChatBackground,
          char.imageChatAvatar
        ].filter(Boolean).length;
        
        console.log(`${index + 1}. ${char.name?.ja || 'N/A'} (${char._id})`);
        console.log(`   画像設定: ${imageCount}/4 フィールド`);
        console.log(`   更新日時: ${char.updatedAt}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB接続終了');
  }
}

// スクリプト実行
const characterId = process.argv[2];
debugCharacterImages(characterId);