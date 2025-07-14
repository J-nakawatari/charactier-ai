// MongoDBの初期化スクリプト
// このスクリプトはMongoDBコンテナの初回起動時に実行されます

// データベースを作成
db = db.getSiblingDB('charactier');

// インデックスを作成
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: 1 });

db.characters.createIndex({ isActive: 1 });
db.characters.createIndex({ createdAt: -1 });

db.chats.createIndex({ userId: 1, characterId: 1 });
db.chats.createIndex({ lastActivityAt: -1 });

db.tokenusages.createIndex({ userId: 1 });
db.tokenusages.createIndex({ createdAt: -1 });

db.characterpromptcaches.createIndex({ characterId: 1, userId: 1 });
db.characterpromptcaches.createIndex({ ttl: 1 }, { expireAfterSeconds: 0 });

db.purchases.createIndex({ userId: 1 });
db.purchases.createIndex({ stripeSessionId: 1 });
db.purchases.createIndex({ createdAt: -1 });

print('Database indexes created successfully');