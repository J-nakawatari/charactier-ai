const mongoose = require('mongoose');
require('dotenv').config();

async function analyzePricing() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const { calcTokensToGive, USD_JPY_RATE, PROFIT_MARGIN, COST_RATIO } = require('../dist/src/config/tokenConfig');
    
    console.log('🔍 現在の設定値:');
    console.log('==========================================');
    console.log(`利益率: ${PROFIT_MARGIN * 100}%`);
    console.log(`原価率: ${COST_RATIO * 100}%`);
    console.log(`フォールバック為替レート: ${USD_JPY_RATE}円/USD`);
    console.log('');
    
    console.log('💰 価格別トークン付与数（gpt-4o-mini使用）:');
    console.log('==========================================');
    
    const prices = [500, 1000, 2000, 5000, 10000];
    const results = [];
    
    for (const price of prices) {
      const tokens = await calcTokensToGive(price, 'gpt-4o-mini');
      const tokensPerYen = tokens / price;
      const messagesEstimate = Math.floor(tokens / 150); // 1メッセージ約150トークン
      
      results.push({
        price,
        tokens,
        tokensPerYen,
        messagesEstimate
      });
      
      console.log(`¥${price.toLocaleString()}:`);
      console.log(`  付与トークン: ${tokens.toLocaleString()} トークン`);
      console.log(`  1円あたり: ${tokensPerYen.toFixed(1)} トークン`);
      console.log(`  推定メッセージ数: 約${messagesEstimate.toLocaleString()} 回`);
      console.log('');
    }
    
    // 原価計算の検証
    console.log('📊 原価計算の検証:');
    console.log('==========================================');
    
    // gpt-4o-miniの実際のコスト（USD）
    const inputCostUSD = 0.00000015;  // $0.15 per 1M tokens
    const outputCostUSD = 0.0000006;  // $0.6 per 1M tokens
    const avgCostUSD = (inputCostUSD + 2 * outputCostUSD) / 3; // 1:2の比率
    const avgCostJPY = avgCostUSD * 150; // 固定レートで計算
    
    console.log(`入力コスト: $${inputCostUSD * 1000000}/1M tokens`);
    console.log(`出力コスト: $${outputCostUSD * 1000000}/1M tokens`);
    console.log(`平均コスト（USD）: $${avgCostUSD.toFixed(10)}/token`);
    console.log(`平均コスト（JPY）: ¥${avgCostJPY.toFixed(8)}/token`);
    console.log('');
    
    // 500円での実際の原価と利益
    const tokens500 = results[0].tokens;
    const actualCost500 = tokens500 * avgCostJPY;
    const profit500 = 500 - actualCost500;
    const actualProfitMargin = (profit500 / 500) * 100;
    
    console.log('500円購入時の実際の数値:');
    console.log(`  付与トークン: ${tokens500.toLocaleString()}`);
    console.log(`  実際の原価: ¥${actualCost500.toFixed(2)}`);
    console.log(`  実際の利益: ¥${profit500.toFixed(2)}`);
    console.log(`  実際の利益率: ${actualProfitMargin.toFixed(2)}%`);
    console.log('');
    
    // 推奨設定の提案
    console.log('💡 推奨設定の提案:');
    console.log('==========================================');
    
    // もし利益率90%を目標とする場合
    const targetProfitMargin = 0.90;
    const targetCostRatio = 1 - targetProfitMargin;
    const tokensPerYenAt90 = targetCostRatio / avgCostJPY;
    const tokens500At90 = Math.floor(500 * tokensPerYenAt90);
    
    console.log('利益率90%の場合:');
    console.log(`  1円あたり: ${tokensPerYenAt90.toFixed(1)} トークン`);
    console.log(`  500円で: ${tokens500At90.toLocaleString()} トークン`);
    console.log(`  推定メッセージ数: 約${Math.floor(tokens500At90 / 150)} 回`);
    
    // もし利益率85%を目標とする場合
    const targetProfitMargin85 = 0.85;
    const targetCostRatio85 = 1 - targetProfitMargin85;
    const tokensPerYenAt85 = targetCostRatio85 / avgCostJPY;
    const tokens500At85 = Math.floor(500 * tokensPerYenAt85);
    
    console.log('\n利益率85%の場合:');
    console.log(`  1円あたり: ${tokensPerYenAt85.toFixed(1)} トークン`);
    console.log(`  500円で: ${tokens500At85.toLocaleString()} トークン`);
    console.log(`  推定メッセージ数: 約${Math.floor(tokens500At85 / 150)} 回`);
    
    // もし利益率80%を目標とする場合
    const targetProfitMargin80 = 0.80;
    const targetCostRatio80 = 1 - targetProfitMargin80;
    const tokensPerYenAt80 = targetCostRatio80 / avgCostJPY;
    const tokens500At80 = Math.floor(500 * tokensPerYenAt80);
    
    console.log('\n利益率80%の場合:');
    console.log(`  1円あたり: ${tokensPerYenAt80.toFixed(1)} トークン`);
    console.log(`  500円で: ${tokens500At80.toLocaleString()} トークン`);
    console.log(`  推定メッセージ数: 約${Math.floor(tokens500At80 / 150)} 回`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

analyzePricing();