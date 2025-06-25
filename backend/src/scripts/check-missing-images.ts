import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models after mongoose is configured
async function loadModels() {
  // Set mongoose to use the same promise library
  mongoose.Promise = global.Promise;

  // Import models
  await import('../models/CharacterModel');
  await import('../models/BadgeModel');
  
  return {
    Character: mongoose.model('Character'),
    Badge: mongoose.model('Badge')
  };
}

interface MissingImage {
  collection: string;
  documentId: string;
  field: string;
  url: string;
  filePath: string;
}

async function checkMissingImages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to MongoDB');

    // Load models after connection
    const { Character, Badge } = await loadModels();

    const missingImages: MissingImage[] = [];
    const projectRoot = path.join(__dirname, '../../..');

    // Check Character images
    console.log('\nChecking Character images...');
    const characters = await Character.find({});
    
    for (const character of characters) {
      const imageFields = [
        { field: 'imageCharacterSelect', value: character.imageCharacterSelect },
        { field: 'imageDashboard', value: character.imageDashboard },
        { field: 'imageChatBackground', value: character.imageChatBackground },
        { field: 'imageChatAvatar', value: character.imageChatAvatar },
        { field: 'sampleVoiceUrl', value: character.sampleVoiceUrl }
      ];

      // Check main image fields
      for (const { field, value } of imageFields) {
        if (value && value.startsWith('/uploads/')) {
          const filePath = path.join(projectRoot, value);
          if (!fs.existsSync(filePath)) {
            missingImages.push({
              collection: 'Character',
              documentId: character._id.toString(),
              field,
              url: value,
              filePath
            });
          }
        }
      }

      // Check gallery images
      if (character.galleryImages && Array.isArray(character.galleryImages)) {
        for (const galleryImage of character.galleryImages) {
          if (galleryImage.url && galleryImage.url.startsWith('/uploads/')) {
            const filePath = path.join(projectRoot, galleryImage.url);
            if (!fs.existsSync(filePath)) {
              missingImages.push({
                collection: 'Character',
                documentId: character._id.toString(),
                field: `galleryImages[${galleryImage.requiredAffinity}]`,
                url: galleryImage.url,
                filePath
              });
            }
          }
        }
      }
    }

    // Check Badge images
    console.log('\nChecking Badge images...');
    const badges = await Badge.find({});
    
    for (const badge of badges) {
      if (badge.iconUrl && badge.iconUrl.startsWith('/uploads/')) {
        const filePath = path.join(projectRoot, badge.iconUrl);
        if (!fs.existsSync(filePath)) {
          missingImages.push({
            collection: 'Badge',
            documentId: badge._id.toString(),
            field: 'iconUrl',
            url: badge.iconUrl,
            filePath
          });
        }
      }
    }

    // Report results
    console.log('\n=== Missing Images Report ===');
    console.log(`Total missing images: ${missingImages.length}`);
    
    if (missingImages.length > 0) {
      console.log('\nDetails:');
      for (const missing of missingImages) {
        console.log(`\n- Collection: ${missing.collection}`);
        console.log(`  Document ID: ${missing.documentId}`);
        console.log(`  Field: ${missing.field}`);
        console.log(`  URL: ${missing.url}`);
        console.log(`  Expected path: ${missing.filePath}`);
      }

      // Generate fix options
      console.log('\n=== Fix Options ===');
      console.log('1. Set missing images to null:');
      console.log('   npm run fix-missing-images -- --action=null');
      console.log('\n2. Set to default placeholder:');
      console.log('   npm run fix-missing-images -- --action=placeholder');
      console.log('\n3. Delete documents with missing images:');
      console.log('   npm run fix-missing-images -- --action=delete');
    } else {
      console.log('\nAll image references are valid! ✅');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the check
checkMissingImages();