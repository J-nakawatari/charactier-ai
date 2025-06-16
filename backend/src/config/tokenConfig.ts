/**
 * トークン計算設定の一元管理（利益率90%）
 * 
 * ⚠️ 重要: この設定値の変更は収益に直接影響します
 * 変更前に必ず以下を確認してください:
 * 1. 利益率の計算
 * 2. 既存ユーザーへの影響
 * 3. テスト環境での検証
 */

interface ModelUnitCostUSD {
  input: number;
  output: number;
}

export const MODEL_UNIT_COST_USD: Record<string, ModelUnitCostUSD> = {
  'gpt-3.5-turbo': { input: 0.0000005, output: 0.0000015 },  // $0.5/$1.5 per 1M
  'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },   // $0.15/$0.6 per 1M
  'o4-mini': { input: 0.0000011, output: 0.0000044 },        // $1.1/$4.4 per 1M (本番用)
  'gpt-4.1-mini': { input: 0.000002, output: 0.000008 }      // $2/$8 per 1M (参考値)
};

export const USD_JPY_RATE = 150;                             // フォールバック固定レート（動的取得失敗時）
export const PROFIT_MARGIN = 0.90;                           // 利益率90%
export const COST_RATIO = 1 - PROFIT_MARGIN;                 // 原価率10%

/**
 * 平均原価計算（入力:出力 = 1:2の比率）
 * ⚠️ 注意: 動的為替レート対応のため getCurrentExchangeRate() を使用すること
 */
export const avgTokenCostYen = async (model: string): Promise<number> => {
  const u = MODEL_UNIT_COST_USD[model];
  if (!u) {
    throw new Error(`Unknown model: ${model}`);
  }
  
  // 動的為替レート取得（フォールバック付き）
  let exchangeRate: number;
  try {
    const { getCurrentExchangeRate } = await import('../services/exchangeRateService');
    exchangeRate = await getCurrentExchangeRate();
  } catch (error) {
    console.warn('⚠️ Failed to get dynamic exchange rate, using fallback:', error);
    exchangeRate = USD_JPY_RATE;
  }
  
  return ((u.input + 2 * u.output) / 3) * exchangeRate;
};

/**
 * 1円あたりのトークン数
 */
export const tokensPerYen = async (model: string): Promise<number> => {
  const costYen = await avgTokenCostYen(model);
  return COST_RATIO / costYen;
};

/**
 * トークン付与数計算（メイン関数）
 */
export const calcTokensToGive = async (
  purchaseAmountYen: number,
  model: string = 'o4-mini'  // 本番用デフォルト
): Promise<number> => {
  const tokensPerYenValue = await tokensPerYen(model);
  return Math.floor(purchaseAmountYen * tokensPerYenValue);
};

/**
 * 設定値の妥当性チェック
 */
export const validateModel = (model: string): boolean => {
  if (!MODEL_UNIT_COST_USD[model]) {
    console.error(`❌ Unknown model: ${model}`);
    return false;
  }
  return true;
};

/**
 * デバッグ用：モデル別設定を表示
 */
export const logTokenConfig = async (model: string = 'o4-mini'): Promise<void> => {
  if (!validateModel(model)) return;
  
  const costYen = await avgTokenCostYen(model);
  const tokensPerYenValue = await tokensPerYen(model);
  const tokens500 = await calcTokensToGive(500, model);
  
  console.log('🔧 Token Configuration:');
  console.log(`   Model: ${model}`);
  console.log(`   Average Cost: ${costYen.toFixed(8)}円/token`);
  console.log(`   Profit Margin: ${PROFIT_MARGIN * 100}%`);
  console.log(`   Cost Ratio: ${COST_RATIO * 100}%`);
  console.log(`   Tokens per Yen: ${tokensPerYenValue.toFixed(2)}tokens/円`);
  console.log(`   500円購入時: ${tokens500}tokens`);
};