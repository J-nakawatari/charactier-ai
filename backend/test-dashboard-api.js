const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { UserModel } = require('./dist/src/models/UserModel');
const { CharacterModel } = require('./dist/src/models/CharacterModel');
const { ChatModel } = require('./dist/src/models/ChatModel');

async function testDashboardAPI() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find a user with affinities
    const testUserId = '6855f88b4ac708f408cc94db'; // User from previous test
    
    console.log('\n🔍 Testing Dashboard API logic for user:', testUserId);
    
    // Step 1: Get user with lean() - exactly as dashboard API does
    console.log('\n1️⃣ Getting user with lean():');
    const user = await UserModel.findById(testUserId)
      .select('-password')
      .lean();
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('User found:', {
      id: user._id,
      name: user.name,
      affinitiesExists: !!user.affinities,
      affinitiesCount: user.affinities?.length || 0
    });
    
    // Step 2: Check if affinities field exists (as dashboard API does)
    if (!user.affinities) {
      console.log('⚠️  User affinities field is missing');
      user.affinities = [];
    }
    
    // Step 3: If no affinities, try separate query (as dashboard API does)
    if (!user.affinities || user.affinities.length === 0) {
      console.log('\n2️⃣ No affinities in user object, trying separate query:');
      const userWithAffinities = await UserModel.findById(testUserId)
        .select('affinities')
        .populate('affinities.character', '_id name imageCharacterSelect imageChatAvatar')
        .lean();
      
      if (userWithAffinities && userWithAffinities.affinities) {
        console.log('Found affinities in separate query:', {
          count: userWithAffinities.affinities.length
        });
        user.affinities = userWithAffinities.affinities;
      }
    }
    
    // Step 4: Process affinities data (as dashboard API does)
    console.log('\n3️⃣ Processing affinities data:');
    const processedAffinities = user.affinities ? user.affinities.map((affinity) => ({
      character: affinity.character ? {
        _id: affinity.character._id || affinity.character,
        name: affinity.character.name || { ja: 'Unknown', en: 'Unknown' },
        imageCharacterSelect: affinity.character.imageCharacterSelect || affinity.character.imageChatAvatar || '/uploads/placeholder.png'
      } : null,
      level: affinity.level || 0,
      experience: affinity.experience || 0,
      experienceToNext: affinity.experienceToNext || 100,
      emotionalState: affinity.emotionalState || 'neutral',
      relationshipType: affinity.relationshipType || 'stranger',
      trustLevel: affinity.trustLevel || 0,
      intimacyLevel: affinity.intimacyLevel || 0,
      totalConversations: affinity.totalConversations || 0,
      totalMessages: affinity.totalMessages || 0,
      lastInteraction: affinity.lastInteraction || null,
      currentStreak: affinity.currentStreak || 0,
      maxStreak: affinity.maxStreak || 0,
      unlockedRewards: affinity.unlockedRewards || [],
      nextRewardLevel: affinity.nextRewardLevel || 10
    })) : [];
    
    console.log('Processed affinities count:', processedAffinities.length);
    if (processedAffinities.length > 0) {
      console.log('First processed affinity:', JSON.stringify(processedAffinities[0], null, 2));
    }
    
    // Step 5: Get purchased characters
    console.log('\n4️⃣ Getting purchased characters:');
    const purchasedCharacters = await CharacterModel.find({
      _id: { $in: user.purchasedCharacters || [] }
    }).select('name imageChatAvatar purchasePrice');
    console.log('Purchased characters count:', purchasedCharacters.length);
    
    // Step 6: Get recent chats
    console.log('\n5️⃣ Getting recent chats:');
    const recentChats = await ChatModel.find({ userId: testUserId })
      .sort({ lastActivityAt: -1 })
      .limit(5)
      .populate('characterId', 'name imageChatAvatar');
    console.log('Recent chats count:', recentChats.length);
    
    // Final dashboard data structure
    console.log('\n✅ Final dashboard data structure:');
    const dashboardData = {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        tokenBalance: user.tokenBalance,
        isSetupComplete: user.isSetupComplete
      },
      affinities: processedAffinities,
      affinitiesCount: processedAffinities.length
    };
    
    console.log(JSON.stringify(dashboardData, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testDashboardAPI();