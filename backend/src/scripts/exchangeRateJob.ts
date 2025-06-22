import cron from 'node-cron';
import { updateExchangeRate } from '../services/exchangeRateService';

/**
 * 為替レート自動更新Cronジョブ
 * 毎週月曜日の午前10時に実行
 */
export function startExchangeRateJob(): void {
  console.log('💱 Starting Exchange Rate Update Cron Job (weekly on Monday 10:00 AM)...');

  // 毎週月曜日の午前10時に実行 (0 10 * * 1)
  cron.schedule('0 10 * * 1', async () => {
    try {
      console.log('💱 Running weekly exchange rate update...');
      
      const result = await updateExchangeRate();
      
      if (result.success) {
        console.log(`✅ Exchange rate update completed: ${result.rate} JPY/USD (source: ${result.source})`);
        
        if (!result.isValid) {
          console.warn(`⚠️ WARNING: Rate flagged as invalid but saved: ${result.reason}`);
        }
      } else {
        console.error(`❌ Exchange rate update failed: ${result.reason}`);
        console.log(`🔄 Using fallback rate: ${result.rate} JPY/USD`);
      }
      
    } catch (error) {
      console.error('❌ Error in exchange rate cron job:', error);
    }
  });

  console.log('✅ Exchange Rate Update Cron Job started successfully');
}

/**
 * 初回起動時に為替レートを取得（オプション）
 */
export async function initializeExchangeRate(): Promise<void> {
  try {
    console.log('🚀 Initializing exchange rate on startup...');
    
    const result = await updateExchangeRate();
    
    if (result.success) {
      console.log(`✅ Initial exchange rate set: ${result.rate} JPY/USD (source: ${result.source})`);
    } else {
      console.warn(`⚠️ Initial exchange rate failed, using fallback: ${result.rate} JPY/USD`);
    }
  } catch (error) {
    console.error('❌ Error initializing exchange rate:', error);
  }
}