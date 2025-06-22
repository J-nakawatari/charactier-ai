import cron from 'node-cron';
import { updateExchangeRate } from '../services/exchangeRateService';
import log from '../utils/logger';

/**
 * 為替レート自動更新Cronジョブ
 * 毎週月曜日の午前10時に実行
 */
export function startExchangeRateJob(): void {
  log.info('Starting Exchange Rate Update Cron Job (weekly on Monday 10:00 AM)');

  // 毎週月曜日の午前10時に実行 (0 10 * * 1)
  cron.schedule('0 10 * * 1', async () => {
    try {
      log.info('Running weekly exchange rate update');
      
      const result = await updateExchangeRate();
      
      if (result.success) {
        log.info('Exchange rate update completed', {
          rate: `${result.rate} JPY/USD`,
          source: result.source
        });
        
        if (!result.isValid) {
          log.warn('Rate flagged as invalid but saved', { reason: result.reason });
        }
      } else {
        log.error('Exchange rate update failed', { reason: result.reason });
        log.info('Using fallback rate', { rate: `${result.rate} JPY/USD` });
      }
      
    } catch (error) {
      log.error('Error in exchange rate cron job', error as Error);
    }
  });

  log.info('Exchange Rate Update Cron Job started successfully');
}

/**
 * 初回起動時に為替レートを取得（オプション）
 */
export async function initializeExchangeRate(): Promise<void> {
  try {
    log.info('Initializing exchange rate on startup');
    
    const result = await updateExchangeRate();
    
    if (result.success) {
      log.info('Initial exchange rate set', {
        rate: `${result.rate} JPY/USD`,
        source: result.source
      });
    } else {
      log.warn('Initial exchange rate failed, using fallback', {
        rate: `${result.rate} JPY/USD`
      });
    }
  } catch (error) {
    log.error('Error initializing exchange rate', error as Error);
  }
}