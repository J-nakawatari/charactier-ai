import { createClient, RedisClientType } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient: ReturnType<typeof createClient> | null = null;
let redisSubscriber: ReturnType<typeof createClient> | null = null;
let redisPublisher: ReturnType<typeof createClient> | null = null;
let isConnecting = false;

export const getRedisClient = async (): Promise<any> => {
  // Redis利用可能性をチェック
  if (process.env.DISABLE_REDIS === 'true') {
    console.log('🚫 Redis無効化モード（メモリフォールバック）');
    return createMockRedisClient();
  }

  if (!redisClient && !isConnecting) {
    isConnecting = true;
    console.log('🔌 Redis接続を初期化:', redisUrl);
    
    try {
      redisClient = createClient({ 
        url: redisUrl,
        socket: {
          connectTimeout: 3000, // 3秒でタイムアウト
          reconnectStrategy: (retries) => {
            if (retries > 3) return false; // 3回で諦める
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
      
    } catch (error) {
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

// メモリベースのモッククライアント（Redis利用不可時）
const memoryStore = new Map<string, { value: string; expiry?: number }>();

const createMockRedisClient = (): any => {
  return {
    set: async (key: string, value: string, options?: { EX?: number }) => {
      console.log('📝 Memory Store SET:', key, value);
      const expiry = options?.EX ? Date.now() + (options.EX * 1000) : undefined;
      memoryStore.set(key, { value, expiry });
      return 'OK';
    },
    get: async (key: string) => {
      const item = memoryStore.get(key);
      if (!item) return null;
      
      // 期限切れチェック
      if (item.expiry && Date.now() > item.expiry) {
        memoryStore.delete(key);
        return null;
      }
      
      console.log('📖 Memory Store GET:', key, item.value);
      return item.value;
    },
    del: async (key: string) => {
      const deleted = memoryStore.delete(key);
      console.log('🗑️ Memory Store DEL:', key, deleted);
      return deleted ? 1 : 0;
    }
  };
};

// 🔄 Pub/Sub専用クライアント取得
export const getRedisPublisher = async (): Promise<any> => {
  if (process.env.DISABLE_REDIS === 'true') {
    return createMockPubSubClient();
  }

  if (!redisPublisher) {
    try {
      redisPublisher = createClient({ url: redisUrl });
      await redisPublisher.connect();
      console.log('📡 Redis Publisher接続成功');
    } catch (error) {
      console.error('❌ Redis Publisher接続失敗:', error);
      return createMockPubSubClient();
    }
  }
  return redisPublisher;
};

export const getRedisSubscriber = async (): Promise<any> => {
  if (process.env.DISABLE_REDIS === 'true') {
    return createMockPubSubClient();
  }

  if (!redisSubscriber) {
    try {
      redisSubscriber = createClient({ url: redisUrl });
      await redisSubscriber.connect();
      console.log('📡 Redis Subscriber接続成功');
    } catch (error) {
      console.error('❌ Redis Subscriber接続失敗:', error);
      return createMockPubSubClient();
    }
  }
  return redisSubscriber;
};

// 🛡️ セキュリティイベント発行
export const publishSecurityEvent = async (eventData: any) => {
  try {
    const publisher = await getRedisPublisher();
    const eventMessage = JSON.stringify({
      ...eventData,
      timestamp: new Date().toISOString(),
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
    await publisher.publish('security:events', eventMessage);
    console.log('🛡️ セキュリティイベント発行:', eventData.type);
  } catch (error) {
    console.error('❌ セキュリティイベント発行失敗:', error);
  }
};

// モックPub/Subクライアント（Redis利用不可時）
const mockSubscribers = new Map<string, Set<Function>>();

const createMockPubSubClient = (): any => {
  return {
    publish: async (channel: string, message: string) => {
      console.log('📡 Mock Publish:', channel, message);
      const subscribers = mockSubscribers.get(channel);
      if (subscribers) {
        subscribers.forEach(callback => {
          try {
            callback(message, channel);
          } catch (error) {
            console.error('Mock subscriber error:', error);
          }
        });
      }
      return 1;
    },
    subscribe: async (channel: string, callback: Function) => {
      console.log('📡 Mock Subscribe:', channel);
      if (!mockSubscribers.has(channel)) {
        mockSubscribers.set(channel, new Set());
      }
      mockSubscribers.get(channel)!.add(callback);
    },
    unsubscribe: async (channel: string, callback?: Function) => {
      console.log('📡 Mock Unsubscribe:', channel);
      if (callback) {
        mockSubscribers.get(channel)?.delete(callback);
      } else {
        mockSubscribers.delete(channel);
      }
    }
  };
};

export const closeRedisConnection = async () => {
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

// アプリ終了時のクリーンアップ
process.on('SIGINT', () => {
  closeRedisConnection();
});

process.on('SIGTERM', () => {
  closeRedisConnection();
});