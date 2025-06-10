import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient: ReturnType<typeof createClient> | null = null;
let isConnecting = false;

export const getRedisClient = async () => {
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

const createMockRedisClient = () => {
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

export const closeRedisConnection = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('🔌 Redis接続を閉じました');
  }
};

// アプリ終了時のクリーンアップ
process.on('SIGINT', () => {
  closeRedisConnection();
});

process.on('SIGTERM', () => {
  closeRedisConnection();
});