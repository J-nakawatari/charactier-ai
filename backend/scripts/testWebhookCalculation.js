const mongoose = require('mongoose');
require('dotenv').config();

async function testWebhookCalculation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Import the same modules the webhook uses
    const TokenService = require('../services/tokenService');
    const { calcTokensToGive, MODEL_UNIT_COST_USD, logTokenConfig } = require('../dist/src/config/tokenConfig');
    
    console.log('🔍 Testing webhook token calculation path...\n');
    
    // Test 1: Direct calculation with different models
    console.log('=== Test 1: Direct calcTokensToGive ===');
    const models = ['o4-mini', 'gpt-3.5-turbo'];
    for (const model of models) {
      const tokens = await calcTokensToGive(500, model);
      console.log(`Model ${model}: ¥500 = ${tokens} tokens`);
    }
    
    // Test 2: Using TokenService (what webhook uses)
    console.log('\n=== Test 2: TokenService.calculateTokensToGive ===');
    const currentModel = process.env.OPENAI_MODEL || 'o4-mini';
    console.log(`Environment OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'not set'}`);
    console.log(`Using model: ${currentModel}`);
    
    const tokensFromService = await TokenService.calculateTokensToGive(500, currentModel);
    console.log(`TokenService result: ¥500 = ${tokensFromService} tokens`);
    
    // Test 3: Default model test
    console.log('\n=== Test 3: Default model (no parameter) ===');
    const tokensDefault = await TokenService.calculateTokensToGive(500);
    console.log(`Default result: ¥500 = ${tokensDefault} tokens`);
    
    // Test 4: Show model configuration
    console.log('\n=== Test 4: Model Configuration ===');
    console.log('Available models:', Object.keys(MODEL_UNIT_COST_USD));
    await logTokenConfig('o4-mini');
    
    // Test 5: Check if there's a mismatch in module loading
    console.log('\n=== Test 5: Module paths ===');
    console.log('TokenService path:', require.resolve('../services/tokenService'));
    console.log('tokenConfig path:', require.resolve('../dist/src/config/tokenConfig'));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the test
testWebhookCalculation();