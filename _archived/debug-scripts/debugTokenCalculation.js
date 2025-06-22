#!/usr/bin/env node

/**
 * Debug script to analyze token calculation issues
 * Run with: node scripts/debugTokenCalculation.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Models
const User = require('../models/User');
const TokenUsage = require('../models/TokenUsage');
const Chat = require('../models/Chat');

async function analyzeTokenUsage(userId) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB');

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found');
      return;
    }

    console.log('\n👤 User Information:');
    console.log(`- ID: ${user._id}`);
    console.log(`- Name: ${user.name}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Token Balance: ${user.tokenBalance?.toLocaleString() || 0}`);

    // Get recent token usage
    const recentUsage = await TokenUsage.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    console.log('\n📈 Recent Token Usage (Last 20):');
    console.log('Date\t\t\tTokens Used\tModel\t\tInput/Output');
    console.log('-'.repeat(80));
    
    let totalTokens = 0;
    let messageCount = 0;
    
    recentUsage.forEach(usage => {
      if (usage.tokenType === 'chat_message') {
        totalTokens += usage.tokensUsed;
        messageCount++;
        
        const date = new Date(usage.createdAt).toLocaleString('ja-JP');
        console.log(`${date}\t${usage.tokensUsed}\t\t${usage.model || 'N/A'}\t${usage.inputTokens || 0}/${usage.outputTokens || 0}`);
      }
    });

    if (messageCount > 0) {
      const avgTokensPerMessage = Math.round(totalTokens / messageCount);
      console.log('\n📊 Token Usage Statistics:');
      console.log(`- Total messages analyzed: ${messageCount}`);
      console.log(`- Total tokens used: ${totalTokens.toLocaleString()}`);
      console.log(`- Average tokens per message: ${avgTokensPerMessage}`);
      console.log(`- Expected messages remaining: ${Math.floor(user.tokenBalance / avgTokensPerMessage).toLocaleString()}`);
    }

    // Get character-specific usage
    const characterUsage = await TokenUsage.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), tokenType: 'chat_message' } },
      { $group: {
        _id: '$characterId',
        totalTokens: { $sum: '$tokensUsed' },
        messageCount: { $sum: 1 },
        avgTokens: { $avg: '$tokensUsed' },
        maxTokens: { $max: '$tokensUsed' },
        minTokens: { $min: '$tokensUsed' }
      }},
      { $sort: { totalTokens: -1 } }
    ]);

    if (characterUsage.length > 0) {
      console.log('\n🎭 Token Usage by Character:');
      console.log('Character ID\t\t\t\tMessages\tAvg Tokens\tMin/Max');
      console.log('-'.repeat(80));
      
      for (const usage of characterUsage) {
        console.log(`${usage._id}\t${usage.messageCount}\t\t${Math.round(usage.avgTokens)}\t\t${usage.minTokens}/${usage.maxTokens}`);
      }
    }

    // Sample a recent chat to show prompt length
    const recentChat = await Chat.findOne({ userId })
      .sort({ lastActivityAt: -1 })
      .populate('characterId');

    if (recentChat && recentChat.messages.length > 0) {
      console.log('\n💬 Sample Recent Chat Analysis:');
      console.log(`- Character: ${recentChat.characterId?.name || 'Unknown'}`);
      console.log(`- Total messages: ${recentChat.messages.length}`);
      
      // Find the last assistant message with tokens
      const lastAIMessage = recentChat.messages
        .filter(m => m.role === 'assistant' && m.tokensUsed)
        .slice(-1)[0];
      
      if (lastAIMessage) {
        console.log(`- Last AI response tokens: ${lastAIMessage.tokensUsed}`);
        console.log(`- Response length: ${lastAIMessage.content.length} characters`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Analysis complete');
  }
}

// Get user ID from command line or use default
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node scripts/debugTokenCalculation.js <userId>');
  console.log('Example: node scripts/debugTokenCalculation.js 507f1f77bcf86cd799439011');
  process.exit(1);
}

analyzeTokenUsage(userId);