/**
 * 価格設定とトークン計算の設定管理
 * 環境変数による柔軟な設定調整を可能にする
 */

/**
 * 価格設定の取得
 * @returns {Object} 価格設定オブジェクト
 */
const getPricingConfig = () => {
  // 環境変数から設定を取得（デフォルト値あり）
  const usdToJpyRate = parseFloat(process.env.USD_TO_JPY_RATE || '150');
  const gpt4CostUsd = parseFloat(process.env.GPT4_COST_PER_TOKEN_USD || '0.00144');
  const profitMargin = parseFloat(process.env.PROFIT_MARGIN || '0.99'); // 99%利益率システム
  
  // 日本円でのGPT-4コスト計算
  const gpt4CostPerTokenYen = gpt4CostUsd * usdToJpyRate;
  
  return {
    // 基本設定
    usdToJpyRate,
    gpt4CostUsd,
    gpt4CostPerTokenYen,
    profitMargin,
    
    // 計算設定
    roundingMode: process.env.TOKEN_ROUNDING_MODE || 'floor', // 'floor', 'ceil', 'round'
    minTokensPerPurchase: parseInt(process.env.MIN_TOKENS_PER_PURCHASE || '100'),
    maxTokensPerPurchase: parseInt(process.env.MAX_TOKENS_PER_PURCHASE || '100000'),
    
    // 料金プラン設定
    planPrices: [
      parseInt(process.env.PLAN_PRICE_1 || '500'),
      parseInt(process.env.PLAN_PRICE_2 || '1000'),
      parseInt(process.env.PLAN_PRICE_3 || '2000'),
      parseInt(process.env.PLAN_PRICE_4 || '5000')
    ],
    
    // デバッグ・ログ設定
    enablePricingLogs: process.env.ENABLE_PRICING_LOGS === 'true',
    enableCostTracking: process.env.ENABLE_COST_TRACKING === 'true',
    
    // 安全性設定
    maxProfitMargin: parseFloat(process.env.MAX_PROFIT_MARGIN || '0.8'),
    minProfitMargin: parseFloat(process.env.MIN_PROFIT_MARGIN || '0.3'),
    
    // 通貨表示設定
    currencySymbol: process.env.CURRENCY_SYMBOL || '¥',
    currencyCode: process.env.CURRENCY_CODE || 'JPY'
  };
};

/**
 * トークン数の計算（設定に基づく）
 * @param {number} purchaseAmountYen - 購入金額（円）
 * @returns {Object} 計算結果
 */
const calculateTokensWithConfig = (purchaseAmountYen) => {
  const config = getPricingConfig();
  
  // 利益率の検証
  if (config.profitMargin < config.minProfitMargin || config.profitMargin > config.maxProfitMargin) {
    throw new Error(`利益率が範囲外です: ${config.profitMargin} (範囲: ${config.minProfitMargin}-${config.maxProfitMargin})`);
  }
  
  // API原価上限計算
  const apiCostLimit = purchaseAmountYen * config.profitMargin;
  
  // トークン数計算
  let tokensToGive = apiCostLimit / config.gpt4CostPerTokenYen;
  
  // 丸め処理
  switch (config.roundingMode) {
    case 'ceil':
      tokensToGive = Math.ceil(tokensToGive);
      break;
    case 'round':
      tokensToGive = Math.round(tokensToGive);
      break;
    case 'floor':
    default:
      tokensToGive = Math.floor(tokensToGive);
      break;
  }
  
  // 最小・最大値の制限
  tokensToGive = Math.max(config.minTokensPerPurchase, tokensToGive);
  tokensToGive = Math.min(config.maxTokensPerPurchase, tokensToGive);
  
  // 実際のAPI原価計算
  const actualApiCost = tokensToGive * config.gpt4CostPerTokenYen;
  const actualProfit = purchaseAmountYen - actualApiCost;
  const actualProfitMargin = purchaseAmountYen > 0 ? (actualProfit / purchaseAmountYen) : 0;
  
  const result = {
    // 入力
    purchaseAmountYen,
    
    // 計算結果
    tokensToGive,
    apiCostLimit,
    actualApiCost,
    actualProfit,
    actualProfitMargin,
    
    // 設定情報
    config: {
      usdToJpyRate: config.usdToJpyRate,
      gpt4CostPerTokenYen: config.gpt4CostPerTokenYen,
      profitMargin: config.profitMargin,
      roundingMode: config.roundingMode
    },
    
    // フォーマット済み
    formatted: {
      tokensToGive: tokensToGive.toLocaleString(),
      purchaseAmount: `${config.currencySymbol}${purchaseAmountYen.toLocaleString()}`,
      actualApiCost: `${config.currencySymbol}${actualApiCost.toFixed(2)}`,
      actualProfit: `${config.currencySymbol}${actualProfit.toFixed(2)}`,
      actualProfitMargin: `${(actualProfitMargin * 100).toFixed(2)}%`,
      tokensPerYen: (tokensToGive / purchaseAmountYen).toFixed(3)
    }
  };
  
  // ログ出力（設定に応じて）
  if (config.enablePricingLogs) {
    console.log('💰 トークン計算結果:', {
      購入金額: result.formatted.purchaseAmount,
      付与トークン: result.formatted.tokensToGive,
      API原価: result.formatted.actualApiCost,
      利益: result.formatted.actualProfit,
      利益率: result.formatted.actualProfitMargin,
      円あたりトークン: result.formatted.tokensPerYen
    });
  }
  
  return result;
};

/**
 * 料金プランの生成
 * @returns {Array} 料金プラン配列
 */
const generateTokenPlans = () => {
  const config = getPricingConfig();
  
  const planTemplates = [
    { name: 'スターター', description: '軽くチャットを楽しみたい方向け', icon: '🌱' },
    { name: 'レギュラー', description: '日常的にチャットを楽しむ方向け', icon: '⭐' },
    { name: 'プレミアム', description: 'たくさんチャットしたい方向け', icon: '💎' },
    { name: 'ヘビーユーザー', description: '本格的にご利用の方向け', icon: '🚀' }
  ];
  
  return config.planPrices.map((price, index) => {
    const calculation = calculateTokensWithConfig(price);
    const template = planTemplates[index] || { 
      name: `プラン${index + 1}`, 
      description: `${price}円プラン`, 
      icon: '📦' 
    };
    
    return {
      id: `plan_${index + 1}`,
      name: template.name,
      description: template.description,
      icon: template.icon,
      priceYen: price,
      tokensGiven: calculation.tokensToGive,
      estimatedMessages: Math.floor(calculation.tokensToGive / 150), // 1メッセージ約150トークン
      
      // 詳細情報
      details: {
        tokensPerYen: calculation.formatted.tokensPerYen,
        apiCost: calculation.formatted.actualApiCost,
        profit: calculation.formatted.actualProfit,
        profitMargin: calculation.formatted.actualProfitMargin
      },
      
      // 表示用フォーマット
      display: {
        price: calculation.formatted.purchaseAmount,
        tokens: calculation.formatted.tokensToGive,
        value: `${calculation.formatted.tokensPerYen}トークン/円`
      },
      
      // Stripe用ID（環境変数から取得可能）
      stripePriceId: process.env[`STRIPE_PRICE_ID_${index + 1}`] || null,
      stripeProductId: process.env[`STRIPE_PRODUCT_ID_${index + 1}`] || null
    };
  });
};

/**
 * 為替レート変更時の影響分析
 * @param {number} newUsdToJpyRate - 新しい為替レート
 * @returns {Object} 影響分析結果
 */
const analyzeExchangeRateImpact = (newUsdToJpyRate) => {
  const currentConfig = getPricingConfig();
  const currentRate = currentConfig.usdToJpyRate;
  
  // 新しいレートでの計算
  const newGpt4CostYen = currentConfig.gpt4CostUsd * newUsdToJpyRate;
  const rateChange = ((newUsdToJpyRate - currentRate) / currentRate) * 100;
  
  // 料金プランへの影響
  const planImpacts = currentConfig.planPrices.map(price => {
    const currentTokens = calculateTokensWithConfig(price).tokensToGive;
    
    // 新しいレートでの計算（一時的に環境変数を変更）
    const originalRate = process.env.USD_TO_JPY_RATE;
    process.env.USD_TO_JPY_RATE = newUsdToJpyRate.toString();
    process.env.GPT4_COST_PER_TOKEN_YEN = newGpt4CostYen.toString();
    
    const newTokens = calculateTokensWithConfig(price).tokensToGive;
    
    // 環境変数を元に戻す
    if (originalRate) {
      process.env.USD_TO_JPY_RATE = originalRate;
    } else {
      delete process.env.USD_TO_JPY_RATE;
    }
    
    const tokenChange = ((newTokens - currentTokens) / currentTokens) * 100;
    
    return {
      priceYen: price,
      currentTokens,
      newTokens,
      tokenChange: tokenChange.toFixed(2) + '%',
      impact: Math.abs(tokenChange) > 5 ? 'significant' : 'minor'
    };
  });
  
  return {
    currentRate,
    newRate: newUsdToJpyRate,
    rateChange: rateChange.toFixed(2) + '%',
    costImpact: {
      currentGpt4CostYen: currentConfig.gpt4CostPerTokenYen.toFixed(6),
      newGpt4CostYen: newGpt4CostYen.toFixed(6),
      costChange: (((newGpt4CostYen - currentConfig.gpt4CostPerTokenYen) / currentConfig.gpt4CostPerTokenYen) * 100).toFixed(2) + '%'
    },
    planImpacts,
    recommendation: Math.abs(rateChange) > 10 ? 'rate_update_recommended' : 'no_action_needed'
  };
};

/**
 * 設定の検証
 * @returns {Object} 検証結果
 */
const validatePricingConfig = () => {
  const config = getPricingConfig();
  const errors = [];
  const warnings = [];
  
  // 基本検証
  if (config.usdToJpyRate < 100 || config.usdToJpyRate > 200) {
    warnings.push(`為替レートが異常です: ${config.usdToJpyRate}円`);
  }
  
  if (config.gpt4CostUsd <= 0) {
    errors.push(`GPT-4コストが無効です: $${config.gpt4CostUsd}`);
  }
  
  if (config.profitMargin < 0 || config.profitMargin > 1) {
    errors.push(`利益率が範囲外です: ${config.profitMargin}`);
  }
  
  // 料金プラン検証
  config.planPrices.forEach((price, index) => {
    if (price < 100) {
      warnings.push(`プラン${index + 1}の価格が低すぎます: ${price}円`);
    }
    
    try {
      const calculation = calculateTokensWithConfig(price);
      if (calculation.actualProfitMargin < 0.3) {
        warnings.push(`プラン${index + 1}の利益率が低いです: ${calculation.formatted.actualProfitMargin}`);
      }
    } catch (error) {
      errors.push(`プラン${index + 1}の計算エラー: ${error.message}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  getPricingConfig,
  calculateTokensWithConfig,
  generateTokenPlans,
  analyzeExchangeRateImpact,
  validatePricingConfig
};