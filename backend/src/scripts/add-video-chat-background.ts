import mongoose from 'mongoose';
import { CharacterModel } from '../models/CharacterModel';
import * as dotenv from 'dotenv';
import path from 'path';

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function addVideoChatBackgroundField() {
  try {
    // MongoDB接続
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/charactier-ai');
    console.log('✅ MongoDBに接続しました');

    // すべてのキャラクターを取得
    const characters = await CharacterModel.find({});
    console.log(`📊 ${characters.length}個のキャラクターが見つかりました`);

    let updatedCount = 0;
    for (const character of characters) {
      // videoChatBackgroundフィールドが存在しない場合は追加
      if (!('videoChatBackground' in character)) {
        await CharacterModel.updateOne(
          { _id: character._id },
          { $set: { videoChatBackground: null } }
        );
        updatedCount++;
        console.log(`✅ キャラクター ${character.name.ja} にvideoChatBackgroundフィールドを追加しました`);
      }
    }

    console.log(`\n📊 更新完了: ${updatedCount}個のキャラクターにvideoChatBackgroundフィールドを追加しました`);

    // 確認のため、星乃ゆまのデータを再取得
    const yuma = await CharacterModel.findById('685913353428f47f2088e2ba');
    if (yuma) {
      console.log('\n🔍 星乃ゆまの確認:');
      console.log('  videoChatBackground:', yuma.videoChatBackground);
      console.log('  フィールド存在確認:', 'videoChatBackground' in yuma);
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ MongoDBから切断しました');
  }
}

// 実行
addVideoChatBackgroundField();