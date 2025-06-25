const mongoose = require('mongoose');
require('dotenv').config({ path: '../backend/.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/charactier-ai');

const UserModel = require('../backend/src/models/UserModel');
const CharacterModel = require('../backend/src/models/CharacterModel');

async function testDashboardQuery() {
  try {
    console.log('=== Testing Dashboard Query ===\n');
    
    // Find a test user - replace with your test user ID
    const testUserId = '67669b10db20ede8c5c3e875'; // Replace with actual user ID
    
    console.log('1. Testing query WITHOUT populating affinities.character:');
    const userWithoutPopulate = await UserModel.findById(testUserId)
      .populate('purchasedCharacters', '_id name')
      .lean();
    
    console.log('  - User found:', !!userWithoutPopulate);
    console.log('  - Affinities count:', userWithoutPopulate?.affinities?.length || 0);
    console.log('  - First affinity (no populate):', userWithoutPopulate?.affinities?.[0]);
    
    console.log('\n2. Testing query WITH populating affinities.character:');
    const userWithPopulate = await UserModel.findById(testUserId)
      .populate('purchasedCharacters', '_id name')
      .populate('affinities.character', '_id name imageCharacterSelect themeColor')
      .lean();
    
    console.log('  - User found:', !!userWithPopulate);
    console.log('  - Affinities count:', userWithPopulate?.affinities?.length || 0);
    console.log('  - First affinity (with populate):', JSON.stringify(userWithPopulate?.affinities?.[0], null, 2));
    
    console.log('\n3. Testing alternative query approach:');
    const userAlt = await UserModel.findById(testUserId).lean();
    console.log('  - Raw affinities data:', userAlt?.affinities?.map(a => ({
      characterId: a.character,
      level: a.level,
      experience: a.experience
    })));
    
    // Manual population test
    if (userAlt?.affinities?.length > 0) {
      const firstAffinity = userAlt.affinities[0];
      const character = await CharacterModel.findById(firstAffinity.character)
        .select('_id name imageCharacterSelect themeColor')
        .lean();
      console.log('  - Manually populated character:', character);
    }
    
    console.log('\n4. Testing toObject() conversion:');
    const userDoc = await UserModel.findById(testUserId)
      .populate('purchasedCharacters', '_id name')
      .populate('affinities.character', '_id name imageCharacterSelect themeColor');
    
    if (userDoc) {
      const userObject = userDoc.toObject();
      console.log('  - toObject() affinities count:', userObject.affinities?.length || 0);
      console.log('  - toObject() first affinity:', userObject.affinities?.[0]);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testDashboardQuery();