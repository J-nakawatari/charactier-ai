import { FullConfig } from '@playwright/test';
import { testDataManager } from './fixtures/test-data';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  // .env.testファイルを読み込む
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
  
  console.log('🚀 E2E Test Global Setup Starting...');
  
  try {
    // テストデータベースに接続
    await testDataManager.connect();
    console.log('✅ Connected to test database');
    
    // グローバルテストデータを作成
    const testUser = await testDataManager.createTestUser({
      email: 'global-test@example.com',
      password: 'Test123!',
      name: 'グローバルテストユーザー'
    });
    console.log('✅ Created global test user:', testUser.email);
    
    // 無料テストキャラクターを作成
    const freeCharacter = await testDataManager.createTestCharacter({
      name: '無料テストキャラクター',
      price: 0
    });
    console.log('✅ Created free test character:', freeCharacter.name);
    
    // 有料テストキャラクターを作成
    const paidCharacter = await testDataManager.createTestCharacter({
      name: '有料テストキャラクター',
      price: 1000
    });
    console.log('✅ Created paid test character:', paidCharacter.name);
    
    // グローバル変数に保存（テストで使用可能）
    process.env.TEST_USER_EMAIL = testUser.email;
    process.env.TEST_USER_PASSWORD = testUser.password;
    process.env.TEST_FREE_CHARACTER_ID = freeCharacter._id;
    process.env.TEST_PAID_CHARACTER_ID = paidCharacter._id;
    
    console.log('✅ E2E Test Global Setup Completed');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;