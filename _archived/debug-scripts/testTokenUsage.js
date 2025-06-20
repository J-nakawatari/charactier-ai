#!/usr/bin/env node

/**
 * Test script to verify TokenUsage is being recorded
 * 
 * This script:
 * 1. Makes a test chat message
 * 2. Checks if TokenUsage was created
 */

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const TokenUsage = require('../models/TokenUsage').default;
const axios = require('axios');

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

async function testTokenUsage() {
  try {
    // Connect to MongoDB
    log.section('Connecting to MongoDB');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/charactier', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    log.success('Connected to MongoDB');

    // 1. Get initial count
    log.section('Initial TokenUsage Count');
    const initialCount = await TokenUsage.countDocuments();
    log.data('Initial document count', initialCount);

    // 2. Check recent entries
    if (initialCount > 0) {
      const recent = await TokenUsage.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      
      log.section('Recent TokenUsage Entries');
      recent.forEach((entry, idx) => {
        log.info(`Entry ${idx + 1}:`);
        log.data('', {
          userId: entry.userId,
          characterId: entry.characterId,
          tokensUsed: entry.tokensUsed,
          aiModel: entry.aiModel,
          createdAt: entry.createdAt
        });
      });
    }

    // 3. Monitor for new entries
    log.section('Monitoring for New Entries');
    log.info('Make a chat message in the frontend to test token usage tracking...');
    log.info('Checking for new entries every 5 seconds...');

    let checkCount = 0;
    const maxChecks = 12; // Check for 1 minute

    const checkInterval = setInterval(async () => {
      checkCount++;
      
      const currentCount = await TokenUsage.countDocuments();
      
      if (currentCount > initialCount) {
        log.success(`New TokenUsage entry detected! (${currentCount - initialCount} new entries)`);
        
        const newest = await TokenUsage.findOne()
          .sort({ createdAt: -1 })
          .lean();
        
        log.data('Newest entry', {
          _id: newest._id,
          userId: newest.userId,
          characterId: newest.characterId,
          tokensUsed: newest.tokensUsed,
          tokenType: newest.tokenType,
          aiModel: newest.aiModel,
          apiCostYen: newest.apiCostYen,
          profitMargin: newest.profitMargin,
          createdAt: newest.createdAt
        });
        
        clearInterval(checkInterval);
        await mongoose.connection.close();
        log.info('Test completed successfully!');
        process.exit(0);
      } else {
        log.info(`Check ${checkCount}/${maxChecks}: Still ${currentCount} entries...`);
        
        if (checkCount >= maxChecks) {
          log.warning('No new entries detected after 1 minute');
          clearInterval(checkInterval);
          await mongoose.connection.close();
          process.exit(1);
        }
      }
    }, 5000);

  } catch (error) {
    log.error(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testTokenUsage();