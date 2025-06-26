const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { UserModel } = require('./dist/src/models/UserModel');
const { CharacterModel } = require('./dist/src/models/CharacterModel');

async function debugAffinityData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find a user with affinities
    const users = await UserModel.find({ 'affinities.0': { $exists: true } })
      .limit(1)
      .select('_id name email affinities');
    
    if (users.length === 0) {
      console.log('❌ No users with affinities found');
      return;
    }
    
    const user = users[0];
    console.log('\n👤 User found:', {
      id: user._id,
      name: user.name,
      email: user.email,
      affinitiesCount: user.affinities?.length || 0
    });
    
    // Test different ways of loading affinities
    console.log('\n📊 Testing different query methods:');
    
    // Method 1: Using lean()
    console.log('\n1️⃣ Using lean():');
    const userLean = await UserModel.findById(user._id)
      .select('-password')
      .lean();
    console.log('Affinities count:', userLean.affinities?.length || 0);
    console.log('First affinity:', userLean.affinities?.[0]);
    
    // Method 2: Using populate with lean()
    console.log('\n2️⃣ Using populate with lean():');
    const userPopulateLean = await UserModel.findById(user._id)
      .select('-password')
      .populate('affinities.character', '_id name imageCharacterSelect')
      .lean();
    console.log('Affinities count:', userPopulateLean.affinities?.length || 0);
    console.log('First affinity:', userPopulateLean.affinities?.[0]);
    
    // Method 3: Without lean()
    console.log('\n3️⃣ Without lean():');
    const userDoc = await UserModel.findById(user._id)
      .select('-password')
      .populate('affinities.character', '_id name imageCharacterSelect');
    console.log('Affinities count:', userDoc.affinities?.length || 0);
    console.log('First affinity:', userDoc.affinities?.[0]);
    
    // Method 4: Separate query for affinities
    console.log('\n4️⃣ Separate query for affinities:');
    const userAffinities = await UserModel.findById(user._id)
      .select('affinities')
      .populate('affinities.character', '_id name imageCharacterSelect')
      .lean();
    console.log('Affinities count:', userAffinities?.affinities?.length || 0);
    console.log('First affinity:', userAffinities?.affinities?.[0]);
    
    // Check if character references exist
    if (user.affinities?.length > 0) {
      console.log('\n🔍 Checking character references:');
      for (const affinity of user.affinities.slice(0, 3)) {
        const character = await CharacterModel.findById(affinity.character);
        console.log(`Character ${affinity.character}:`, character ? 'EXISTS' : 'NOT FOUND');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debugAffinityData();