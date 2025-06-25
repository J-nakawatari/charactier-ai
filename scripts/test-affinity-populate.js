require('dotenv').config({ path: '../backend/.env' });
const mongoose = require('mongoose');
const path = require('path');

// Import models - need to use the TypeScript compiled version
const { UserModel } = require('../backend/dist/src/models/UserModel');
const { CharacterModel } = require('../backend/dist/src/models/CharacterModel');

async function testAffinityPopulate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find a user with affinities
    const users = await UserModel.find({ 'affinities.0': { $exists: true } }).limit(1);
    
    if (users.length === 0) {
      console.log('No users with affinities found');
      return;
    }

    const userId = users[0]._id;
    console.log('\nTesting user:', userId);

    // Test 1: Without populate
    console.log('\n1. WITHOUT populate:');
    const userWithoutPopulate = await UserModel.findById(userId)
      .populate('purchasedCharacters', '_id name');
    
    console.log('Affinities count:', userWithoutPopulate.affinities?.length || 0);
    console.log('First affinity:', JSON.stringify(userWithoutPopulate.affinities?.[0], null, 2));

    // Test 2: With populate
    console.log('\n2. WITH populate:');
    const userWithPopulate = await UserModel.findById(userId)
      .populate('purchasedCharacters', '_id name')
      .populate('affinities.character', '_id name imageCharacterSelect themeColor');
    
    console.log('Affinities count:', userWithPopulate.affinities?.length || 0);
    console.log('First affinity:', JSON.stringify(userWithPopulate.affinities?.[0], null, 2));

    // Test 3: Check if populate worked
    const firstAffinity = userWithPopulate.affinities?.[0];
    if (firstAffinity) {
      console.log('\n3. Populate check:');
      console.log('Character is populated:', typeof firstAffinity.character === 'object');
      console.log('Character name:', firstAffinity.character?.name);
      console.log('Character image:', firstAffinity.character?.imageCharacterSelect);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testAffinityPopulate();