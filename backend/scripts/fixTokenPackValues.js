const mongoose = require('mongoose');
require('dotenv').config();

async function fixTokenPackValues() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Import token calculation
    const { calcTokensToGive } = require('../dist/src/config/tokenConfig');
    const { TokenPackModel } = require('../dist/src/models/TokenPackModel');
    
    // Get all token packs
    const tokenPacks = await TokenPackModel.find({});
    console.log(`\n📦 Found ${tokenPacks.length} token packs in database\n`);
    
    if (tokenPacks.length === 0) {
      console.log('⚠️  No token packs found. Creating default packs...\n');
      
      // Default token packs based on o4-mini calculations
      const defaultPacks = [
        { price: 500, name: 'スターター', description: '軽くチャットを楽しみたい方向け' },
        { price: 1000, name: 'レギュラー', description: '日常的にチャットを楽しむ方向け' },
        { price: 2000, name: 'プレミアム', description: 'たくさんチャットしたい方向け' },
        { price: 5000, name: 'ヘビーユーザー', description: '本格的にご利用の方向け' }
      ];
      
      for (const pack of defaultPacks) {
        const tokens = await calcTokensToGive(pack.price, 'o4-mini');
        const newPack = await TokenPackModel.create({
          name: pack.name,
          description: pack.description,
          price: pack.price,
          tokens: tokens,
          tokenPerYen: tokens / pack.price,
          isActive: true,
          profitMargin: 90,
          displayOrder: pack.price / 500,
          priceId: `price_${pack.price}_yen` // You'll need to update with actual Stripe price IDs
        });
        
        console.log(`✅ Created: ${pack.name} - ¥${pack.price} = ${tokens} tokens (${(tokens/pack.price).toFixed(2)} tokens/yen)`);
      }
    } else {
      // Fix existing packs
      console.log('🔄 Checking and fixing existing token packs...\n');
      
      for (const pack of tokenPacks) {
        const correctTokens = await calcTokensToGive(pack.price, 'o4-mini');
        const oldTokens = pack.tokens;
        const difference = correctTokens - oldTokens;
        const percentDiff = ((difference / oldTokens) * 100).toFixed(1);
        
        console.log(`📦 ${pack.name} (¥${pack.price}):`);
        console.log(`   Current: ${oldTokens} tokens`);
        console.log(`   Correct: ${correctTokens} tokens`);
        console.log(`   Difference: ${difference} tokens (${percentDiff}%)`);
        
        if (Math.abs(difference) > 1) {
          // Update if difference is significant
          pack.tokens = correctTokens;
          pack.tokenPerYen = correctTokens / pack.price;
          pack.profitMargin = 90;
          await pack.save();
          console.log(`   ✅ Updated to correct value\n`);
        } else {
          console.log(`   ✓ Already correct\n`);
        }
      }
    }
    
    // Show final summary
    console.log('\n📊 Final Token Pack Summary:');
    const finalPacks = await TokenPackModel.find({}).sort({ price: 1 });
    
    for (const pack of finalPacks) {
      console.log(`${pack.name}: ¥${pack.price} = ${pack.tokens} tokens (${pack.tokenPerYen.toFixed(2)} tokens/yen)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the script
fixTokenPackValues();