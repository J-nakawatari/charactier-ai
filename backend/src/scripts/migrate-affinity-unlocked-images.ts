import mongoose from 'mongoose';
import { UserModel } from '../models/UserModel';
import { CharacterModel } from '../models/CharacterModel';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数の読み込み
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateAffinityUnlockedImages() {
  try {
    // MongoDB接続
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/charactier';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');

    // すべてのユーザーを取得
    const users = await UserModel.find({ 'affinities.0': { $exists: true } });
    console.log(`📊 Found ${users.length} users with affinities`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        let updated = false;
        const updatedAffinities = [];

        for (const affinity of user.affinities) {
          const updatedAffinity = { ...affinity.toObject() };
          
          // unlockedImages フィールドが存在しない場合は追加
          if (!updatedAffinity.unlockedImages) {
            updatedAffinity.unlockedImages = [];
            updated = true;
          }

          // nextUnlockLevel フィールドが存在しない場合は追加
          if (!updatedAffinity.nextUnlockLevel) {
            updatedAffinity.nextUnlockLevel = Math.floor((updatedAffinity.level || 0) / 10 + 1) * 10;
            updated = true;
          }

          // キャラクターの gallery images に基づいて unlockedImages を計算
          if (updatedAffinity.unlockedImages.length === 0 && updatedAffinity.level > 0) {
            const characterId = updatedAffinity.character || updatedAffinity.characterId;
            if (characterId) {
              const character = await CharacterModel.findById(characterId);
              if (character && character.galleryImages) {
                // レベルに基づいて解放された画像を追加
                for (const image of character.galleryImages) {
                  if (image.unlockLevel <= updatedAffinity.level) {
                    updatedAffinity.unlockedImages.push({
                      imageId: image._id || image.url,
                      unlockedAt: new Date()
                    });
                  }
                }
                if (updatedAffinity.unlockedImages.length > 0) {
                  updated = true;
                  console.log(`  📸 Added ${updatedAffinity.unlockedImages.length} unlocked images for character ${character.name.ja}`);
                }
              }
            }
          }

          updatedAffinities.push(updatedAffinity);
        }

        if (updated) {
          // ユーザーのaffinitiesを更新
          user.affinities = updatedAffinities as any;
          await user.save();
          updatedCount++;
          console.log(`✅ Updated user ${user.email} (${user._id})`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating user ${user.email}:`, error);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
}

// スクリプト実行
migrateAffinityUnlockedImages().catch(console.error);