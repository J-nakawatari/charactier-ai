#!/usr/bin/env node

/**
 * TokenUsage Debug Script
 * 
 * This script helps diagnose issues with TokenUsage collection:
 * - Checks if collection exists
 * - Counts documents
 * - Shows sample documents
 * - Tests aggregation queries
 * - Checks indexes
 */

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const TokenUsage = require('../models/TokenUsage').default;
// Use the compiled JavaScript version
const { UserModel } = require('../dist/src/models/UserModel');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  data: (label, data) => {
    console.log(`${colors.cyan}📊 ${label}:${colors.reset}`);
    console.log(JSON.stringify(data, null, 2));
  },
  section: (title) => {
    console.log(`\n${colors.bright}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.bright}${title}${colors.reset}`);
    console.log(`${colors.bright}${'='.repeat(50)}${colors.reset}\n`);
  }
};

async function debugTokenUsage() {
  try {
    // Connect to MongoDB
    log.section('Connecting to MongoDB');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/charactier', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    log.success('Connected to MongoDB');

    // 1. Check if collection exists
    log.section('Checking TokenUsage Collection');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const tokenUsageExists = collections.some(col => col.name === 'tokenusages');
    
    if (!tokenUsageExists) {
      log.error('TokenUsage collection does not exist!');
      log.info('Creating collection...');
      await mongoose.connection.db.createCollection('tokenusages');
      log.success('Created tokenusages collection');
    } else {
      log.success('TokenUsage collection exists');
    }

    // 2. Count documents
    log.section('Document Count');
    const count = await TokenUsage.countDocuments();
    log.data('Total TokenUsage documents', count);

    if (count === 0) {
      log.warning('No documents found in TokenUsage collection');
      log.info('This could mean:');
      log.info('  - No chats have been made yet');
      log.info('  - Token tracking is not working properly');
      log.info('  - Documents are being saved to a different collection');
    }

    // 3. Get sample documents
    if (count > 0) {
      log.section('Sample Documents');
      const samples = await TokenUsage.find()
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();
      
      samples.forEach((doc, index) => {
        log.data(`Sample ${index + 1}`, {
          _id: doc._id,
          userId: doc.userId,
          characterId: doc.characterId,
          tokensUsed: doc.tokensUsed,
          tokenType: doc.tokenType,
          createdAt: doc.createdAt,
          apiCostYen: doc.apiCostYen
        });
      });
    }

    // 4. Test aggregation query (same as dashboard)
    log.section('Testing Dashboard Aggregation');
    
    // Get a test user
    const testUser = await UserModel.findOne().lean();
    if (!testUser) {
      log.error('No users found in database');
      return;
    }
    
    log.info(`Testing with user: ${testUser.email} (${testUser._id})`);
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const tokenStats = await TokenUsage.aggregate([
      {
        $match: {
          userId: testUser._id,
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalTokens: { $sum: "$tokensUsed" },
          totalCost: { $sum: "$apiCostYen" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    log.data('Token stats for last 7 days', tokenStats);

    // 5. Check all token usage for this user
    const userTokenUsage = await TokenUsage.find({ userId: testUser._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    log.data(`All token usage for user ${testUser.email}`, userTokenUsage.length);
    
    // 6. Check indexes
    log.section('Checking Indexes');
    const indexes = await TokenUsage.collection.getIndexes();
    log.data('Indexes on TokenUsage collection', Object.keys(indexes));

    // 7. Check for recent token usage (any user)
    log.section('Recent Token Usage (Any User)');
    const recentUsage = await TokenUsage.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    if (recentUsage.length > 0) {
      log.success(`Found ${recentUsage.length} recent token usage records`);
      recentUsage.forEach((usage, index) => {
        log.info(`${index + 1}. User: ${usage.userId}, Tokens: ${usage.tokensUsed}, Date: ${usage.createdAt}`);
      });
    } else {
      log.warning('No recent token usage found');
    }

    // 8. Check field names and schema
    log.section('Schema Validation');
    if (count > 0) {
      const sample = await TokenUsage.findOne().lean();
      const fields = Object.keys(sample);
      log.data('Document fields', fields);
      
      // Check for required fields
      const requiredFields = ['userId', 'characterId', 'tokensUsed', 'tokenType', 'createdAt'];
      const missingFields = requiredFields.filter(field => !fields.includes(field));
      
      if (missingFields.length > 0) {
        log.error(`Missing required fields: ${missingFields.join(', ')}`);
      } else {
        log.success('All required fields present');
      }
    }

    // 9. Test direct collection query
    log.section('Direct Collection Query Test');
    const directCount = await mongoose.connection.db.collection('tokenusages').countDocuments();
    log.data('Direct collection count', directCount);
    
    if (directCount !== count) {
      log.warning(`Mismatch: Model count (${count}) vs Direct count (${directCount})`);
    }

    // 10. Summary
    log.section('Summary');
    if (count === 0) {
      log.warning('No TokenUsage documents found');
      log.info('Recommendations:');
      log.info('  1. Make a test chat to generate token usage');
      log.info('  2. Check chat API endpoints for token tracking code');
      log.info('  3. Verify TokenUsage.create() is being called');
      log.info('  4. Check for any errors in chat logs');
    } else {
      log.success(`TokenUsage collection is working with ${count} documents`);
      if (tokenStats.length === 0) {
        log.warning('But no usage data for the test user in the last 7 days');
      }
    }

  } catch (error) {
    log.error(`Error: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    log.info('Disconnected from MongoDB');
  }
}

// Run the debug script
debugTokenUsage();