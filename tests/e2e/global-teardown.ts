import { FullConfig } from '@playwright/test';
import { testDataManager } from './fixtures/test-data';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 E2E Test Global Teardown Starting...');
  
  try {
    // テストデータをクリーンアップ
    await testDataManager.cleanup();
    console.log('✅ Cleaned up test data');
    
    // データベース接続を閉じる
    await testDataManager.disconnect();
    console.log('✅ Disconnected from test database');
    
    console.log('✅ E2E Test Global Teardown Completed');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // teardownのエラーはテスト結果に影響しないようにする
  }
}

export default globalTeardown;