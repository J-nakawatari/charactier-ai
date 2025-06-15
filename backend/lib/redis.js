"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedisConnection = exports.publishSecurityEvent = exports.getRedisSubscriber = exports.getRedisPublisher = exports.getRedisClient = void 0;
const redis_1 = require("redis");
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let redisClient = null;
let redisSubscriber = null;
let redisPublisher = null;
let isConnecting = false;
const getRedisClient = async () => {
    // Redis利用可能性をチェック
    if (process.env.DISABLE_REDIS === 'true') {
        console.log('🚫 Redis無効化モード（メモリフォールバック）');
        return createMockRedisClient();
    }
    if (!redisClient && !isConnecting) {
        isConnecting = true;
        console.log('🔌 Redis接続を初期化:', redisUrl);
        try {
            redisClient = (0, redis_1.createClient)({
                url: redisUrl,
                socket: {
                    connectTimeout: 3000, // 3秒でタイムアウト
                    reconnectStrategy: (retries) => {
                        if (retries > 3)
                            return false; // 3回で諦める
                        return Math.min(retries * 500, 2000);
                    }
                }
            });
            redisClient.on('error', (err) => {
                console.error('❌ Redis接続エラー:', err);
                redisClient = null;
                isConnecting = false;
            });
            redisClient.on('connect', () => {
                console.log('✅ Redis接続成功');
                isConnecting = false;
            });
            redisClient.on('disconnect', () => {
                console.log('🔌 Redis接続切断');
                redisClient = null;
                isConnecting = false;
            });
            await redisClient.connect();
        }
        catch (error) {
            console.error('❌ Redis初期化失敗、メモリフォールバックに切替:', error);
            redisClient = null;
            isConnecting = false;
            return createMockRedisClient();
        }
    }
    // 既存の接続が無効な場合はモックを返す
    if (!redisClient) {
        console.log('⚠️ Redis利用不可、メモリフォールバック使用');
        return createMockRedisClient();
    }
    return redisClient;
};
exports.getRedisClient = getRedisClient;
// メモリベースのモッククライアント（Redis利用不可時）
const memoryStore = new Map();
const createMockRedisClient = () => {
    return {
        set: async (key, value, options) => {
            console.log('📝 Memory Store SET:', key, value);
            const expiry = options?.EX ? Date.now() + (options.EX * 1000) : undefined;
            memoryStore.set(key, { value, expiry });
            return 'OK';
        },
        get: async (key) => {
            const item = memoryStore.get(key);
            if (!item)
                return null;
            // 期限切れチェック
            if (item.expiry && Date.now() > item.expiry) {
                memoryStore.delete(key);
                return null;
            }
            console.log('📖 Memory Store GET:', key, item.value);
            return item.value;
        },
        del: async (key) => {
            const deleted = memoryStore.delete(key);
            console.log('🗑️ Memory Store DEL:', key, deleted);
            return deleted ? 1 : 0;
        }
    };
};
// 🔄 Pub/Sub専用クライアント取得
const getRedisPublisher = async () => {
    if (process.env.DISABLE_REDIS === 'true') {
        return createMockPubSubClient();
    }
    if (!redisPublisher) {
        try {
            redisPublisher = (0, redis_1.createClient)({ url: redisUrl });
            await redisPublisher.connect();
            console.log('📡 Redis Publisher接続成功');
        }
        catch (error) {
            console.error('❌ Redis Publisher接続失敗:', error);
            return createMockPubSubClient();
        }
    }
    return redisPublisher;
};
exports.getRedisPublisher = getRedisPublisher;
const getRedisSubscriber = async () => {
    if (process.env.DISABLE_REDIS === 'true') {
        return createMockPubSubClient();
    }
    if (!redisSubscriber) {
        try {
            redisSubscriber = (0, redis_1.createClient)({ url: redisUrl });
            await redisSubscriber.connect();
            console.log('📡 Redis Subscriber接続成功');
        }
        catch (error) {
            console.error('❌ Redis Subscriber接続失敗:', error);
            return createMockPubSubClient();
        }
    }
    return redisSubscriber;
};
exports.getRedisSubscriber = getRedisSubscriber;
// 🛡️ セキュリティイベント発行
const publishSecurityEvent = async (eventData) => {
    try {
        const publisher = await (0, exports.getRedisPublisher)();
        const eventMessage = JSON.stringify({
            ...eventData,
            timestamp: new Date().toISOString(),
            id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        await publisher.publish('security:events', eventMessage);
        console.log('🛡️ セキュリティイベント発行:', eventData.type);
    }
    catch (error) {
        console.error('❌ セキュリティイベント発行失敗:', error);
    }
};
exports.publishSecurityEvent = publishSecurityEvent;
// モックPub/Subクライアント（Redis利用不可時）
const mockSubscribers = new Map();
const createMockPubSubClient = () => {
    return {
        publish: async (channel, message) => {
            console.log('📡 Mock Publish:', channel, message);
            const subscribers = mockSubscribers.get(channel);
            if (subscribers) {
                subscribers.forEach(callback => {
                    try {
                        callback(message, channel);
                    }
                    catch (error) {
                        console.error('Mock subscriber error:', error);
                    }
                });
            }
            return 1;
        },
        subscribe: async (channel, callback) => {
            console.log('📡 Mock Subscribe:', channel);
            if (!mockSubscribers.has(channel)) {
                mockSubscribers.set(channel, new Set());
            }
            mockSubscribers.get(channel).add(callback);
        },
        unsubscribe: async (channel, callback) => {
            console.log('📡 Mock Unsubscribe:', channel);
            if (callback) {
                mockSubscribers.get(channel)?.delete(callback);
            }
            else {
                mockSubscribers.delete(channel);
            }
        }
    };
};
const closeRedisConnection = async () => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        console.log('🔌 Redis接続を閉じました');
    }
    if (redisPublisher) {
        await redisPublisher.quit();
        redisPublisher = null;
        console.log('📡 Redis Publisher接続を閉じました');
    }
    if (redisSubscriber) {
        await redisSubscriber.quit();
        redisSubscriber = null;
        console.log('📡 Redis Subscriber接続を閉じました');
    }
};
exports.closeRedisConnection = closeRedisConnection;
// アプリ終了時のクリーンアップ
process.on('SIGINT', () => {
    (0, exports.closeRedisConnection)();
});
process.on('SIGTERM', () => {
    (0, exports.closeRedisConnection)();
});
