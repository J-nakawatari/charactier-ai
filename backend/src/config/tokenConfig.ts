/**
 * トークン計算設定の一元管理（99%利益率システム）
 * 
 * ⚠️ 重要: この設定値の変更は収益に直接影響します
 * 変更前に必ず以下を確認してください:
 * 1. 利益率の計算
 * 2. 既存ユーザーへの影響
 * 3. テスト環境での検証
 * 
 * 99%利益率システム: ユーザー支払額の1%のみをコストとして使用
 */

import log from '../utils/logger';

interface ModelUnitCostUSD {
  input: number;
  output: number;
}

export const MODEL_UNIT_COST_USD: Record<string, ModelUnitCostUSD> = {
  'gpt-3.5-turbo': { input: 0.0000005, output: 0.0000015 },  // $0.5/$1.5 per 1M
  'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 }    // $0.15/$0.6 per 1M
};

export const USD_JPY_RATE = 150;                             // フォールバック固定レート（動的取得失敗時）
export const PROFIT_MARGIN = 0.99;                           // 利益率99%（99%利益率システム）
export const COST_RATIO = 1 - PROFIT_MARGIN;                 // 原価率1%

// 固定トークンレートは使用しない（99%利益率システムでは動的計算のみ）
export const USE_FIXED_TOKEN_RATE = false;                   // 99%利益率システムでは常にfalse

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
    log.warn('Failed to get dynamic exchange rate, using fallback', { error: error instanceof Error ? error.message : error });
    exchangeRate = USD_JPY_RATE;
  }
  
  return ((u.input + 2 * u.output) / 3) * exchangeRate;
};

/**
 * 1円あたりのトークン数（99%利益率システム）
 */
export const tokensPerYen = async (model: string): Promise<number> => {
  // 99%利益率システムでは常に動的計算
  const costYen = await avgTokenCostYen(model);
  const result = COST_RATIO / costYen;
  
  // デバッグログ
  log.debug('99%利益率システム - tokensPerYen calculation', {
    model,
    costYen,
    COST_RATIO,
    result,
    profitMargin: PROFIT_MARGIN * 100 + '%'
  });
  
  return result;
};

/**
 * トークン付与数計算（メイン関数）
 */
export const calcTokensToGive = async (
  purchaseAmountYen: number,
  model: string = 'gpt-4o-mini'  // 本番用デフォルト
): Promise<number> => {
  const tokensPerYenValue = await tokensPerYen(model);
  return Math.floor(purchaseAmountYen * tokensPerYenValue);
};

/**
 * 設定値の妥当性チェック
 */
export const validateModel = (model: string): boolean => {
  if (!MODEL_UNIT_COST_USD[model]) {
    log.error(`Unknown model: ${model}`);
    return false;
  }
  return true;
};

/**
 * デバッグ用：モデル別設定を表示
 */
export const logTokenConfig = async (model: string = 'gpt-4o-mini'): Promise<void> => {
  if (!validateModel(model)) return;
  
  const costYen = await avgTokenCostYen(model);
  const tokensPerYenValue = await tokensPerYen(model);
  const tokens500 = await calcTokensToGive(500, model);
  
  const actualCostYen = tokens500 * costYen;
  const actualProfitMargin = ((500 - actualCostYen) / 500) * 100;
  
  log.info('99%利益率システム - Token Configuration', {
    model,
    averageCost: `${costYen.toFixed(8)}円/token`,
    profitMargin: `${PROFIT_MARGIN * 100}%`,
    costRatio: `${COST_RATIO * 100}%`,
    tokensPerYen: `${tokensPerYenValue.toFixed(2)}tokens/円`,
    tokens500Yen: `${tokens500}tokens`,
    actualCostYen: `${actualCostYen.toFixed(2)}円`,
    actualProfit: `${(500 - actualCostYen).toFixed(2)}円`,
    actualProfitMargin: `${actualProfitMargin.toFixed(1)}%`
  });
};