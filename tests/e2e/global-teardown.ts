import { FullConfig } from '@playwright/test';
import { testDataManager } from './fixtures/test-data';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 E2E Test Global Teardown Starting...');
  
  try {
    // MongoDBに接続されている場合のみクリーンアップを実行
    if (testDataManager.isConnected()) {
      // テストデータをクリーンアップ
      await testDataManager.cleanup();
      console.log('✅ Cleaned up test data');
      
      // データベース接続を閉じる
      await testDataManager.disconnect();
      console.log('✅ Disconnected from test database');
    } else {
      console.log('ℹ️ MongoDB未接続のためクリーンアップをスキップ');
    }
    
    console.log('✅ E2E Test Global Teardown Completed');
  } catch (error) {
    console.error('⚠️ クリーンアップ時のエラー:', error.message);
    // teardownのエラーはテスト結果に影響しないようにする
  }
}

export default globalTeardown;