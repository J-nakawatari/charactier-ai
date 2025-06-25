import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Known character image mappings (based on your characters)
const imageRestoreMap = {
  // ミサキ
  '6844bc05fbdd34d06156f234': {
    imageCharacterSelect: '/uploads/images/image-1750364113765-750963163.png',
    imageDashboard: '/uploads/images/image-1749997958461-463909720.png',
    imageChatBackground: '/uploads/images/image-1750045539199-734141092.png',
    imageChatAvatar: '/uploads/images/image-1750050056242-310909376.png'
  },
  // リン
  '6844bc05fbdd34d06156f235': {
    imageCharacterSelect: '/uploads/images/image-1750364085150-501363989.png',
    imageDashboard: '/uploads/images/image-1750653034127-191060219.png',
    imageChatBackground: '/uploads/images/image-1749998007223-663653453.png',
    imageChatAvatar: '/uploads/images/image-1749998013645-887833456.png'
  },
  // よつぎ
  '68489ca4a91145fdd86f4a49': {
    imageCharacterSelect: '/uploads/images/image-1750365650874-5292037.png',
    imageDashboard: '/uploads/images/image-1750066696025-930527016.png',
    imageChatBackground: '/uploads/images/image-1750066974870-637096106.png',
    imageChatAvatar: '/uploads/images/image-1750066701753-85179396.png'
  },
  // 星乃 みゆ
  '685913353428f47f2088e2ba': {
    imageCharacterSelect: '/uploads/images/image-1750669828702-562510453.png',
    imageDashboard: '/uploads/images/image-1750669836692-902714875.png',
    imageChatBackground: '/uploads/images/image-1750669841498-350352616.png',
    imageChatAvatar: '/uploads/images/image-1750669852535-306795154.png'
  }
};

async function restoreImageUrls() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to MongoDB');

    // Import Character model
    await import('../models/CharacterModel');
    const Character = mongoose.model('Character');

    let restoredCount = 0;

    // Restore character images
    for (const [characterId, images] of Object.entries(imageRestoreMap)) {
      const character = await Character.findById(characterId);
      
      if (character) {
        console.log(`\nRestoring images for: ${character.name.ja}`);
        
        const updates: any = {};
        let hasChanges = false;

        // Check each image field
        for (const [field, url] of Object.entries(images)) {
          if (character[field] === '/uploads/placeholder.png') {
            updates[field] = url;
            hasChanges = true;
            console.log(`  - ${field}: ${url}`);
          }
        }

        if (hasChanges) {
          await Character.updateOne({ _id: characterId }, updates);
          restoredCount++;
          console.log(`  ✅ Restored`);
        } else {
          console.log(`  ⏭️  Skipped (not placeholder)`);
        }
      }
    }

    console.log(`\n✅ Restored ${restoredCount} characters`);

    // Note: Gallery images would need to be restored manually or from backup
    console.log('\n⚠️  Note: Gallery images need to be re-uploaded manually from admin panel');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the restoration
restoreImageUrls();