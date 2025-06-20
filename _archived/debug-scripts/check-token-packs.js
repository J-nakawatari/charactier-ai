/**
 * Script to check and update TokenPack entries in the database
 * This script will show current TokenPacks and their token values
 * and optionally update them to match the 94% profit margin
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models and config
const { TokenPackModel } = require('../dist/src/models/TokenPackModel');
const { calcTokensToGive, PROFIT_MARGIN } = require('../dist/src/config/tokenConfig');

async function main() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Fetch all TokenPacks
    console.log('\n📦 Fetching all TokenPacks...');
    const tokenPacks = await TokenPackModel.find({}).sort({ price: 1 });
    
    console.log(`\nFound ${tokenPacks.length} TokenPacks:\n`);
    console.log('Current Profit Margin Configuration:', (PROFIT_MARGIN * 100).toFixed(0) + '%');
    console.log('=' .repeat(100));
    
    // Check each TokenPack
    for (const pack of tokenPacks) {
      console.log(`\n📦 TokenPack: ${pack.name}`);
      console.log(`   ID: ${pack._id}`);
      console.log(`   Price: ¥${pack.price}`);
      console.log(`   Price ID (Stripe): ${pack.priceId || 'Not set'}`);
      console.log(`   Current Tokens: ${pack.tokens.toLocaleString()}`);
      console.log(`   Is Active: ${pack.isActive}`);
      console.log(`   Stored Profit Margin: ${pack.profitMargin}%`);
      
      // Calculate what tokens should be with current profit margin
      const expectedTokens = await calcTokensToGive(pack.price, 'o4-mini');
      console.log(`   Expected Tokens (${PROFIT_MARGIN * 100}% margin): ${expectedTokens.toLocaleString()}`);
      
      const difference = pack.tokens - expectedTokens;
      const percentDiff = ((pack.tokens - expectedTokens) / expectedTokens * 100).toFixed(1);
      
      if (Math.abs(difference) > 10) {
        console.log(`   ⚠️  MISMATCH: Current tokens are ${percentDiff}% ${difference > 0 ? 'higher' : 'lower'} than expected!`);
        console.log(`   ⚠️  Users are getting ${difference > 0 ? 'MORE' : 'FEWER'} tokens than intended!`);
      } else {
        console.log(`   ✅ Tokens match expected value`);
      }
    }
    
    console.log('\n' + '=' .repeat(100));
    console.log('\n❓ What would you like to do?');
    console.log('   1. Update all TokenPacks to use the current 90% profit margin calculation');
    console.log('   2. Update only mismatched TokenPacks');
    console.log('   3. Exit without changes');
    console.log('\nRun with --update-all or --update-mismatched to apply changes');
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--update-all')) {
      console.log('\n🔄 Updating ALL TokenPacks...');
      await updateAllTokenPacks(tokenPacks);
    } else if (args.includes('--update-mismatched')) {
      console.log('\n🔄 Updating only mismatched TokenPacks...');
      await updateMismatchedTokenPacks(tokenPacks);
    } else {
      console.log('\n👋 Exiting without changes. Run with --update-all or --update-mismatched to apply updates.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

async function updateAllTokenPacks(tokenPacks) {
  let updated = 0;
  
  for (const pack of tokenPacks) {
    const expectedTokens = await calcTokensToGive(pack.price, 'o4-mini');
    
    await TokenPackModel.findByIdAndUpdate(pack._id, {
      tokens: expectedTokens,
      profitMargin: PROFIT_MARGIN * 100,
      tokenPerYen: expectedTokens / pack.price
    });
    
    console.log(`   ✅ Updated ${pack.name}: ${pack.tokens.toLocaleString()} → ${expectedTokens.toLocaleString()} tokens`);
    updated++;
  }
  
  console.log(`\n✅ Updated ${updated} TokenPacks`);
}

async function updateMismatchedTokenPacks(tokenPacks) {
  let updated = 0;
  
  for (const pack of tokenPacks) {
    const expectedTokens = await calcTokensToGive(pack.price, 'o4-mini');
    const difference = Math.abs(pack.tokens - expectedTokens);
    
    if (difference > 10) {
      await TokenPackModel.findByIdAndUpdate(pack._id, {
        tokens: expectedTokens,
        profitMargin: PROFIT_MARGIN * 100,
        tokenPerYen: expectedTokens / pack.price
      });
      
      console.log(`   ✅ Updated ${pack.name}: ${pack.tokens.toLocaleString()} → ${expectedTokens.toLocaleString()} tokens`);
      updated++;
    }
  }
  
  console.log(`\n✅ Updated ${updated} mismatched TokenPacks`);
}

// Run the script
main();