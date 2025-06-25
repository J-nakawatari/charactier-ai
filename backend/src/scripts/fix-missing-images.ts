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

const DEFAULT_PLACEHOLDER = '/uploads/placeholder.png';

async function fixMissingImages() {
  try {
    // Get action from command line
    const args = process.argv.slice(2);
    const actionArg = args.find(arg => arg.startsWith('--action='));
    const action = actionArg ? actionArg.split('=')[1] : null;

    if (!['null', 'placeholder', 'delete'].includes(action as string)) {
      console.error('Please specify an action: --action=null, --action=placeholder, or --action=delete');
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to MongoDB');

    // Load models after connection
    const { Character, Badge } = await loadModels();

    const projectRoot = path.join(__dirname, '../../..');
    let fixedCount = 0;

    // Fix Character images
    console.log('\nFixing Character images...');
    const characters = await Character.find({});
    
    for (const character of characters) {
      let hasChanges = false;
      const updates: any = {};

      // Check main image fields
      const imageFields = [
        { field: 'imageCharacterSelect', value: character.imageCharacterSelect },
        { field: 'imageDashboard', value: character.imageDashboard },
        { field: 'imageChatBackground', value: character.imageChatBackground },
        { field: 'imageChatAvatar', value: character.imageChatAvatar }
      ];

      for (const { field, value } of imageFields) {
        if (value && value.startsWith('/uploads/')) {
          const filePath = path.join(projectRoot, value);
          if (!fs.existsSync(filePath)) {
            if (action === 'null') {
              updates[field] = null;
            } else if (action === 'placeholder') {
              updates[field] = DEFAULT_PLACEHOLDER;
            }
            hasChanges = true;
          }
        }
      }

      // Handle sample voice URL (audio files)
      if (character.sampleVoiceUrl && character.sampleVoiceUrl.startsWith('/uploads/')) {
        const filePath = path.join(projectRoot, character.sampleVoiceUrl);
        if (!fs.existsSync(filePath)) {
          if (action === 'null') {
            updates.sampleVoiceUrl = null;
          }
          hasChanges = true;
        }
      }

      // Fix gallery images
      if (character.galleryImages && Array.isArray(character.galleryImages)) {
        const validGalleryImages = character.galleryImages.filter(galleryImage => {
          if (galleryImage.url && galleryImage.url.startsWith('/uploads/')) {
            const filePath = path.join(projectRoot, galleryImage.url);
            return fs.existsSync(filePath);
          }
          return true;
        });

        if (validGalleryImages.length !== character.galleryImages.length) {
          updates.galleryImages = validGalleryImages;
          hasChanges = true;
        }
      }

      // Apply updates or delete
      if (hasChanges) {
        if (action === 'delete') {
          await Character.deleteOne({ _id: character._id });
          console.log(`Deleted character: ${character.name} (${character._id})`);
        } else {
          await Character.updateOne({ _id: character._id }, updates);
          console.log(`Fixed character: ${character.name} (${character._id})`);
        }
        fixedCount++;
      }
    }

    // Fix Badge images
    console.log('\nFixing Badge images...');
    const badges = await Badge.find({});
    
    for (const badge of badges) {
      if (badge.iconUrl && badge.iconUrl.startsWith('/uploads/')) {
        const filePath = path.join(projectRoot, badge.iconUrl);
        if (!fs.existsSync(filePath)) {
          if (action === 'delete') {
            await Badge.deleteOne({ _id: badge._id });
            console.log(`Deleted badge: ${badge.name} (${badge._id})`);
          } else if (action === 'null') {
            await Badge.updateOne({ _id: badge._id }, { iconUrl: null });
            console.log(`Fixed badge: ${badge.name} (${badge._id})`);
          } else if (action === 'placeholder') {
            await Badge.updateOne({ _id: badge._id }, { iconUrl: DEFAULT_PLACEHOLDER });
            console.log(`Fixed badge: ${badge.name} (${badge._id})`);
          }
          fixedCount++;
        }
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} documents with missing images`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the fix
fixMissingImages();