const { MongoClient } = require('mongodb');
const argon2 = require('argon2');

async function seedTestData() {
  console.log('🌱 Starting test data seeding...');
  
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/test';
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // テストユーザーのパスワードをArgon2でハッシュ化
    const testUserPassword = await argon2.hash('Test123!', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
      hashLength: 32
    });
    const adminPassword = await argon2.hash('admin123', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
      hashLength: 32
    });
    
    // グローバルテストユーザーを作成
    await db.collection('users').updateOne(
      { email: 'global-test@example.com' },
      { 
        $set: { 
          email: 'global-test@example.com',
          passwordHash: testUserPassword,
          name: 'グローバルテストユーザー',
          isVerified: true,
          emailVerified: true,
          tokens: 10000,
          createdAt: new Date(),
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );
    console.log('✅ Created global test user');
    
    // 管理者ユーザーを作成
    await db.collection('users').updateOne(
      { email: 'admin@example.com' },
      { 
        $set: { 
          email: 'admin@example.com',
          passwordHash: adminPassword,
          name: 'テスト管理者',
          isAdmin: true,
          isVerified: true,
          emailVerified: true,
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
          createdAt: new Date(),
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );
    console.log('✅ Created paid test character');
    
    console.log('✅ Test data seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// スクリプトを実行
seedTestData();