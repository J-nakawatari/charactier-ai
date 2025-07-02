import mongoose from 'mongoose';
import { CharacterModel } from '../models/CharacterModel';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function debugGalleryImages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Get all characters with gallery images
    const characters = await CharacterModel.find({ 
      galleryImages: { $exists: true, $ne: [] } 
    }).select('name galleryImages');

    console.log(`\n📊 Found ${characters.length} characters with gallery images\n`);

    for (const character of characters) {
      console.log(`\n🎭 Character: ${character.name.ja || character.name}`);
      console.log(`   Gallery images count: ${character.galleryImages?.length || 0}`);
      
      if (character.galleryImages && character.galleryImages.length > 0) {
        character.galleryImages.forEach((img, index) => {
          console.log(`   [${index + 1}] Level ${img.unlockLevel}:`);
          console.log(`       URL: ${img.url || 'N/A'}`);
          console.log(`       Title: ${typeof img.title === 'object' ? img.title.ja : img.title || 'N/A'}`);
          console.log(`       Description: ${typeof img.description === 'object' ? img.description.ja : img.description || 'N/A'}`);
          console.log(`       Rarity: ${img.rarity || 'N/A'}`);
          console.log(`       Order: ${img.order || 'N/A'}`);
        });
      }
    }

    // Check for characters without gallery images
    const charactersWithoutGallery = await CharacterModel.find({ 
      $or: [
        { galleryImages: { $exists: false } },
        { galleryImages: { $eq: [] } }
      ]
    }).select('name');

    console.log(`\n⚠️  Characters without gallery images: ${charactersWithoutGallery.length}`);
    charactersWithoutGallery.forEach((char) => {
      console.log(`   - ${char.name.ja || char.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the debug script
debugGalleryImages();