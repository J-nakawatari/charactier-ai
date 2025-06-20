require('dotenv').config();
const mongoose = require('mongoose');

async function simulateWebhook() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Simulate exactly what the webhook does
    console.log('🔍 Simulating webhook token calculation...\n');
    
    // Import from compiled files (what production uses)
    const { calcTokensToGive } = require('../dist/src/config/tokenConfig');
    
    // Simulate webhook variables
    const purchaseAmountYen = 500;
    const currentModel = process.env.OPENAI_MODEL || 'o4-mini';
    
    console.log(`Environment OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'not set'}`);
    console.log(`Using model: ${currentModel}`);
    console.log(`Purchase amount: ¥${purchaseAmountYen}\n`);
    
    // Calculate tokens
    const tokensToGive = await calcTokensToGive(purchaseAmountYen, currentModel);
    
    console.log(`✅ Result: ${tokensToGive} tokens for ¥${purchaseAmountYen}`);
    console.log(`📊 Tokens per yen: ${(tokensToGive / purchaseAmountYen).toFixed(2)}`);
    
    // Compare with what user is getting
    const userReportedTokens = 295709;
    console.log(`\n⚠️  User reported getting: ${userReportedTokens} tokens`);
    console.log(`📊 Difference: ${userReportedTokens - tokensToGive} tokens`);
    
    // Test with different models
    console.log('\n=== Testing different models ===');
    const models = ['o4-mini', 'gpt-3.5-turbo', 'gpt-4o-mini'];
    for (const model of models) {
      const tokens = await calcTokensToGive(purchaseAmountYen, model);
      console.log(`${model}: ${tokens} tokens (${(tokens/purchaseAmountYen).toFixed(2)} tokens/yen)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

simulateWebhook();