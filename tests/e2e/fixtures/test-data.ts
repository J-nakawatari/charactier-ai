import { MongoClient } from 'mongodb';
import * as bcrypt from 'bcryptjs';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  _id?: string;
}

export interface TestCharacter {
  name: string;
  price: number;
  _id?: string;
}

const MONGODB_URI = process.env.MONGODB_URI || process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/charactier-test';

export class TestDataManager {
  private client: MongoClient;
  private testUsers: TestUser[] = [];
  private testCharacters: TestCharacter[] = [];

  constructor() {
    this.client = new MongoClient(MONGODB_URI);
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.cleanup();
    await this.client.close();
  }

  // テストユーザーを作成
  async createTestUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    const db = this.client.db();
    const hashedPassword = await bcrypt.hash(userData.password || 'Test123!', 10);
    
    const user: TestUser = {
      email: userData.email || `test-${Date.now()}@example.com`,
      password: userData.password || 'Test123!',
      name: userData.name || 'テストユーザー',
    };

    const result = await db.collection('users').insertOne({
      ...user,
      password: hashedPassword,
      isEmailVerified: true,
      tokenBalance: 1000, // テスト用トークン
      createdAt: new Date(),
    });

    user._id = result.insertedId.toString();
    this.testUsers.push(user);
    
    return user;
  }

  // テスト管理者を作成
  async createTestAdmin(adminData: Partial<TestUser> = {}): Promise<TestUser> {
    const db = this.client.db();
    const hashedPassword = await bcrypt.hash(adminData.password || 'admin123', 10);
    
    const admin: TestUser = {
      email: adminData.email || 'admin@example.com',
      password: adminData.password || 'admin123',
      name: adminData.name || 'テスト管理者',
    };

    const result = await db.collection('admins').insertOne({
      ...admin,
      password: hashedPassword,
      role: 'super_admin',
      isActive: true,
      createdAt: new Date(),
      lastLogin: new Date()
    });

    admin._id = result.insertedId.toString();
    this.testUsers.push(admin);
    
    return admin;
  }

  // テストキャラクターを作成
  async createTestCharacter(charData: Partial<TestCharacter> = {}): Promise<TestCharacter> {
    const db = this.client.db();
    
    const character: TestCharacter = {
      name: charData.name || `テストキャラ${Date.now()}`,
      price: charData.price || 0, // 無料キャラクター
    };

    const result = await db.collection('characters').insertOne({
      ...character,
      description: 'E2Eテスト用のキャラクター',
      personalityTraits: ['friendly', 'helpful'],
      defaultMood: 'neutral',
      systemPrompt: 'You are a test character for E2E testing.',
      availableForChat: true,
      createdAt: new Date(),
    });

    character._id = result.insertedId.toString();
    this.testCharacters.push(character);
    
    return character;
  }

  // テスト後のクリーンアップ
  async cleanup() {
    const db = this.client.db();
    
    // 作成したテストユーザーを削除
    for (const user of this.testUsers) {
      if (user._id) {
        await db.collection('users').deleteOne({ _id: user._id });
      }
    }
    
    // 作成したテスト管理者を削除
    await db.collection('admins').deleteMany({ email: { $regex: /@example\.com$/ } });
    
    // 作成したテストキャラクターを削除
    for (const character of this.testCharacters) {
      if (character._id) {
        await db.collection('characters').deleteOne({ _id: character._id });
      }
    }
    
    this.testUsers = [];
    this.testCharacters = [];
  }
}

// シングルトンインスタンス
export const testDataManager = new TestDataManager();