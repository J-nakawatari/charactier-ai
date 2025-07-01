import { MongoClient } from 'mongodb';
import * as argon2 from 'argon2';

async function seedCI() {
  console.log('🌱 Starting CI data seeding...');
  
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/test';
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Argon2設定（バックエンドと同じ）
    const ARGON2_CONFIG = {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
      hashLength: 32
    };
    
    // テストユーザーのパスワードをハッシュ化
    const testUserPassword = await argon2.hash('Test123!', ARGON2_CONFIG);
    const adminPassword = await argon2.hash('admin123', ARGON2_CONFIG);
    
    // グローバルテストユーザーを作成
    await db.collection('users').updateOne(
      { email: 'global-test@example.com' },
      { 
        $set: { 
          email: 'global-test@example.com',
          password: testUserPassword,
          name: 'グローバルテストユーザー',
          emailVerified: true,
          tokenBalance: 10000,
          isActive: true,
          isSetupComplete: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );
    console.log('✅ Created global test user');
    
    // 管理者ユーザーを作成
    await db.collection('admins').updateOne(
      { email: 'admin@example.com' },
      { 
        $set: { 
          email: 'admin@example.com',
          password: adminPassword,
          name: 'テスト管理者',
          role: 'super_admin',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );
    console.log('✅ Created admin user');
    
    // 無料テストキャラクターを作成
    await db.collection('characters').updateOne(
      { name: '無料テストキャラクター' },
      { 
        $set: { 
          name: '無料テストキャラクター',
          description: 'E2Eテスト用の無料キャラクター',
          price: 0,
          modelName: 'gpt-3.5-turbo',
          prompt: 'You are a test character.',
          tags: ['テスト', '無料'],
          initialMood: '😊',
          affinityLevels: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );
    console.log('✅ Created free test character');
    
    // 有料テストキャラクターを作成
    await db.collection('characters').updateOne(
      { name: '有料テストキャラクター' },
      { 
        $set: { 
          name: '有料テストキャラクター',
          description: 'E2Eテスト用の有料キャラクター',
          price: 1000,
          modelName: 'gpt-4',
          prompt: 'You are a premium test character.',
          tags: ['テスト', '有料'],
          initialMood: '😎',
          affinityLevels: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );
    console.log('✅ Created paid test character');
    
    // システム設定
    await db.collection('systemsettings').updateOne(
      { key: 'stripe_publishable_key' },
      { 
        $set: { 
          key: 'stripe_publishable_key',
          value: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy',
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );
    console.log('✅ Created system settings');
    
    console.log('✅ CI data seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding CI data:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// スクリプトを実行
seedCI();