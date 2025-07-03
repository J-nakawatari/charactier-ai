import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

// メモリ内MongoDBサーバーを起動
export const setupMemoryDb = async (): Promise<void> => {
  if (process.env.CI === 'true') {
    // CI環境では実際のMongoDBを使用
    return;
  }

  try {
    mongod = await MongoMemoryServer.create({
      instance: {
        dbName: 'charactier-test-memory',
        port: 27018, // 通常のMongoDBと競合を避ける
      },
      binary: {
        downloadDir: './mongodb-binaries',
        version: '6.0.0',
      },
    });

    const uri = mongod.getUri();
    process.env.MONGO_URI = uri;
    
    // MongoDB接続テスト
    await mongoose.connect(uri);
    console.log('✅ MongoDB Memory Server connected successfully');
  } catch (error) {
    console.warn('⚠️ MongoDB Memory Server failed to start, falling back to mock tests');
    // メモリサーバーが失敗した場合はモック化
    delete process.env.MONGO_URI;
  }
};

// メモリ内MongoDBサーバーを停止
export const teardownMemoryDb = async (): Promise<void> => {
  if (mongod) {
    await mongoose.disconnect();
    await mongod.stop();
    console.log('✅ MongoDB Memory Server stopped');
  }
};

// 各テスト後にデータベースをクリア
export const clearMemoryDb = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
};