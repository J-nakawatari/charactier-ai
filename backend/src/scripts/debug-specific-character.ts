import mongoose from 'mongoose';
import { CharacterModel } from '../models/CharacterModel';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function debugSpecificCharacter() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Get character by name
    const characterName = '夕霧 ノア'; // ギャラリー画像がないキャラクター
    const character = await CharacterModel.findOne({ 'name.ja': characterName });

    if (!character) {
      console.log(`❌ Character "${characterName}" not found`);
      return;
    }

    console.log(`\n🎭 Character: ${character.name.ja}`);
    console.log(`   ID: ${character._id}`);
    console.log(`   Has galleryImages field: ${character.galleryImages !== undefined}`);
    console.log(`   galleryImages type: ${typeof character.galleryImages}`);
    console.log(`   galleryImages is array: ${Array.isArray(character.galleryImages)}`);
    console.log(`   galleryImages length: ${character.galleryImages?.length || 0}`);
    console.log(`   galleryImages raw data:`, JSON.stringify(character.galleryImages, null, 2));

    // Check other image fields
    console.log(`\n📸 Other image fields:`);
    console.log(`   imageCharacterSelect: ${character.imageCharacterSelect || 'N/A'}`);
    console.log(`   imageDashboard: ${character.imageDashboard || 'N/A'}`);
    console.log(`   imageChatBackground: ${character.imageChatBackground || 'N/A'}`);
    console.log(`   imageChatAvatar: ${character.imageChatAvatar || 'N/A'}`);

    // Test update with sample gallery image
    console.log('\n🔧 Testing gallery image update...');
    const testGalleryImage = {
      url: '/test/image.png',
      unlockLevel: 10,
      title: { ja: 'テスト画像', en: 'Test Image' },
      description: { ja: 'テスト説明', en: 'Test Description' },
      rarity: 'common' as const,
      tags: [],
      isDefault: false,
      order: 0
    };

    try {
      const updated = await CharacterModel.findByIdAndUpdate(
        character._id,
        { 
          $set: { 
            galleryImages: [testGalleryImage] 
          } 
        },
        { new: true, runValidators: true }
      );

      console.log('✅ Update successful');
      console.log('   New galleryImages:', JSON.stringify(updated?.galleryImages, null, 2));
    } catch (updateError) {
      console.error('❌ Update failed:', updateError);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the debug script
debugSpecificCharacter();