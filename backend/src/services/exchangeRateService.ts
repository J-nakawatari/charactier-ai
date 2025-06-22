import { ExchangeRateModel } from '../models/ExchangeRate';

/**
 * 為替レート取得サービス
 * 週1回の自動更新 + 異常値検知・フォールバック機能
 */

interface ExchangeRateAPIResponse {
  base: string;
  date: string;
  rates: {
    [currency: string]: number;
  };
}

interface FixerAPIResponse {
  success: boolean;
  base: string;
  date: string;
  rates: {
    [currency: string]: number;
  };
}

/**
 * ExchangeRate-API から USD/JPY レートを取得
 * 無料プラン: 1500リクエスト/月
 */
export async function fetchUSDJPYRate(): Promise<number | null> {
  try {
    console.log('🌍 Fetching USD/JPY exchange rate from API...');
    
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json() as ExchangeRateAPIResponse;
    
    if (!data.rates || !data.rates.JPY) {
      throw new Error('Invalid API response structure');
    }

    const rate = data.rates.JPY;
    console.log(`📊 Fetched USD/JPY rate: ${rate} (date: ${data.date})`);
    
    return rate;
  } catch (error) {
    console.error('❌ Failed to fetch exchange rate:', error);
    return null;
  }
}

/**
 * Fixer.io からのフォールバック取得（バックアップAPI）
 * 無料プラン: 100リクエスト/月
 */
export async function fetchUSDJPYRateFromFixer(): Promise<number | null> {
  try {
    // Fixer.ioは無料プランでもAPIキーが必要
    // 環境変数がない場合はスキップ
    const apiKey = process.env.FIXER_IO_API_KEY;
    if (!apiKey) {
      console.log('⚠️ Fixer.io API key not found, skipping backup fetch');
      return null;
    }

    console.log('🌍 Fetching USD/JPY rate from Fixer.io (backup)...');
    
    const response = await fetch(`http://data.fixer.io/api/latest?access_key=${apiKey}&base=USD&symbols=JPY`);
    
    if (!response.ok) {
      throw new Error(`Fixer API responded with status: ${response.status}`);
    }

    const data = await response.json() as FixerAPIResponse;
    
    if (!data.success || !data.rates || !data.rates.JPY) {
      throw new Error('Invalid Fixer API response structure');
    }

    const rate = data.rates.JPY;
    console.log(`📊 Fetched USD/JPY rate from Fixer: ${rate}`);
    
    return rate;
  } catch (error) {
    console.error('❌ Failed to fetch exchange rate from Fixer:', error);
    return null;
  }
}

/**
 * 為替レートを取得・検証・保存する統合関数
 */
export async function updateExchangeRate(): Promise<{
  success: boolean;
  rate: number;
  source: string;
  isValid: boolean;
  reason?: string;
}> {
  try {
    // メインAPIから取得を試行
    let rate = await fetchUSDJPYRate();
    let source = 'exchangerate-api';

    // メインAPIが失敗した場合、バックアップAPIを試行
    if (rate === null) {
      console.log('⚠️ Main API failed, trying backup API...');
      rate = await fetchUSDJPYRateFromFixer();
      source = 'fixer-io';
    }

    // 両方のAPIが失敗した場合
    if (rate === null) {
      console.error('❌ All APIs failed, using fallback rate');
      const fallbackRate = 150;
      
      // フォールバック値を記録
      await ExchangeRateModel.create({
        baseCurrency: 'USD',
        targetCurrency: 'JPY',
        rate: fallbackRate,
        source: 'fallback',
        isValid: false,
        fetchedAt: new Date()
      });

      return {
        success: false,
        rate: fallbackRate,
        source: 'fallback',
        isValid: false,
        reason: 'All exchange rate APIs failed'
      };
    }

    // 異常値チェック
    const validation = await (ExchangeRateModel as any).validateRate(rate);
    
    // データベースに保存
    const exchangeRateRecord = await ExchangeRateModel.create({
      baseCurrency: 'USD',
      targetCurrency: 'JPY',
      rate: rate,
      source: source,
      isValid: validation.isValid,
      previousRate: validation.previousRate,
      fetchedAt: new Date()
    });

    if (validation.isValid) {
      console.log(`✅ Exchange rate updated successfully: ${rate} JPY/USD (source: ${source})`);
    } else {
      console.warn(`⚠️ Exchange rate flagged as invalid: ${rate} JPY/USD (reason: ${validation.reason})`);
    }

    return {
      success: true,
      rate: rate,
      source: source,
      isValid: validation.isValid,
      reason: validation.reason
    };

  } catch (error) {
    console.error('❌ Error in updateExchangeRate:', error);
    
    // エラー時もフォールバック値で記録
    const fallbackRate = 150;
    await ExchangeRateModel.create({
      baseCurrency: 'USD',
      targetCurrency: 'JPY',
      rate: fallbackRate,
      source: 'fallback',
      isValid: false,
      fetchedAt: new Date()
    });

    return {
      success: false,
      rate: fallbackRate,
      source: 'fallback',
      isValid: false,
      reason: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 現在有効な為替レートを取得（トークン計算用）
 */
export async function getCurrentExchangeRate(): Promise<number> {
  try {
    const rate = await (ExchangeRateModel as any).getLatestValidRate('USD', 'JPY');
    console.log(`📊 Using exchange rate for token calculation: ${rate} JPY/USD`);
    return rate;
  } catch (error) {
    console.error('❌ Error getting current exchange rate:', error);
    return 150; // 最終フォールバック
  }
}