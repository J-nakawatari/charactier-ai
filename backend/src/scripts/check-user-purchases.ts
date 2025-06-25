import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkUserPurchases(userEmail?: string) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to MongoDB');

    // Import models
    await import('../models/UserModel');
    await import('../models/CharacterModel');
    const User = mongoose.model('User');
    const Character = mongoose.model('Character');

    // Find user by email or get all users
    const query = userEmail ? { email: userEmail } : {};
    const users = await User.find(query).populate('purchasedCharacters');

    console.log(`\n=== Checking purchases for ${users.length} user(s) ===\n`);

    for (const user of users) {
      console.log(`User: ${user.username} (${user.email})`);
      console.log(`User ID: ${user._id}`);
      console.log(`Purchased Characters Count: ${user.purchasedCharacters?.length || 0}`);
      
      if (user.purchasedCharacters && user.purchasedCharacters.length > 0) {
        console.log(`\nPurchased Characters:`);
        for (const charId of user.purchasedCharacters) {
          const character = await Character.findById(charId);
          if (character) {
            console.log(`  - ${character.name.ja} (${character._id})`);
            console.log(`    Type: ${character.characterAccessType}`);
            console.log(`    Price: ${character.priceYen}円`);
          } else {
            console.log(`  - Character not found: ${charId}`);
          }
        }
      } else {
        console.log(`  No purchased characters`);
      }

      // Check premium characters
      const premiumCharacters = await Character.find({ characterAccessType: 'purchaseOnly' });
      console.log(`\n  Available Premium Characters:`);
      for (const char of premiumCharacters) {
        const isPurchased = user.purchasedCharacters?.some(
          (pc: any) => pc._id?.toString() === char._id.toString() || pc.toString() === char._id.toString()
        );
        console.log(`  - ${char.name.ja} (${char._id}): ${isPurchased ? '✅ Purchased' : '❌ Not purchased'}`);
      }

      console.log('\n' + '='.repeat(50) + '\n');
    }

    // Show purchase records
    const PurchaseHistory = mongoose.model('PurchaseHistory');
    const recentPurchases = await PurchaseHistory.find({ 
      purchaseType: 'character' 
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('userId', 'username email')
    .populate('characterId', 'name');

    console.log('=== Recent Character Purchases ===');
    for (const purchase of recentPurchases) {
      console.log(`\n${purchase.createdAt.toISOString()}`);
      console.log(`User: ${purchase.userId?.username} (${purchase.userId?.email})`);
      console.log(`Character: ${purchase.characterId?.name?.ja}`);
      console.log(`Amount: ${purchase.amountYen}円`);
      console.log(`Stripe Session: ${purchase.stripeSessionId}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Get email from command line argument
const userEmail = process.argv[2];
checkUserPurchases(userEmail);