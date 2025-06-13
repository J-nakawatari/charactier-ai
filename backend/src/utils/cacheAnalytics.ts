import CharacterPromptCache from '../../models/CharacterPromptCache';
import { CharacterModel } from '../models/CharacterModel';

/**
 * CharacterPromptCache Performance Analytics Utility
 * 
 * 高度なキャッシュパフォーマンス分析とメトリクス計算
 */

// MongoDB集約結果の型定義

interface CharacterData {
  _id: string;
  name: string | {
    ja: string;
    en?: string;
  };
  [key: string]: unknown;
}

interface CacheDocument {
  _id: any;
  characterId: string;
  useCount: number;
  lastAccessed: Date;
  lastUsed: Date;
  createdAt: Date;
  promptConfig: {
    affinityLevel: number;
    [key: string]: any;
  };
  promptLength: number;
  [key: string]: any;
}

export interface CachePerformanceMetrics {
  totalCaches: number;
  totalHits: number;
  hitRatio: number;
  averageGenerationTime: number;
  totalMemoryUsage: number;
  cachesByCharacter: CharacterCacheStats[];
  recentActivity: CacheActivity[];
  topPerformingCaches: CacheEntry[];
  invalidationEvents: number;
  cacheEfficiencyScore: number;
}

export interface CharacterCacheStats {
  characterId: string;
  characterName: string;
  totalCaches: number;
  totalHits: number;
  hitRatio: number;
  averageGenerationTime: number;
  memoryUsage: number;
  lastUsed: Date;
  efficiency: number;
  affinityLevelDistribution: AffinityDistribution[];
}

export interface AffinityDistribution {
  affinityRange: string;
  count: number;
  hitRatio: number;
}

export interface CacheActivity {
  timestamp: Date;
  action: 'hit' | 'miss' | 'create' | 'invalidate';
  characterId: string;
  characterName: string;
  affinityLevel: number;
  generationTime?: number;
  userId: string;
}

export interface CacheEntry {
  _id: string;
  characterId: string;
  characterName: string;
  affinityLevel: number;
  useCount: number;
  efficiency: number;
  lastUsed: Date;
  memorySize: number;
  hitRatio: number;
}

export interface CacheInvalidationStats {
  totalInvalidations: number;
  byReason: {
    ttlExpired: number;
    characterUpdate: number;
    manual: number;
    lowUsage: number;
  };
  averageLifespan: number;
  lastCleanup: Date;
}

/**
 * 総合キャッシュパフォーマンスメトリクス取得
 */
export async function getCachePerformanceMetrics(
  timeframe: number = 30
): Promise<CachePerformanceMetrics> {
  const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
  
  try {
    // 基本統計の並列取得
    const [totalCaches, characters, recentCaches] = await Promise.all([
      CharacterPromptCache.countDocuments({ 
        ttl: { $gt: new Date() } 
      }),
      CharacterModel.find({ isActive: true }),
      CharacterPromptCache.find({
        lastUsed: { $gte: startDate },
        ttl: { $gt: new Date() }
      }).sort({ lastUsed: -1 }).limit(100)
    ]);

    // キャラクター別統計
    const characterStats = await getCacheStatsByCharacter(characters, timeframe);
    
    // 集計計算
    const totalHits = characterStats.reduce((sum, char) => sum + char.totalHits, 0);
    const totalGenerationTime = characterStats.reduce((sum, char) => 
      sum + (char.averageGenerationTime * char.totalCaches), 0
    );
    const totalMemoryUsage = characterStats.reduce((sum, char) => sum + char.memoryUsage, 0);
    
    const hitRatio = totalCaches > 0 ? totalHits / (totalCaches * 10) : 0; // 仮の計算
    const averageGenerationTime = totalCaches > 0 ? totalGenerationTime / totalCaches : 0;
    
    // 最新アクティビティ（実際の実装では別途ログから取得）
    const recentActivity = recentCaches.slice(0, 20).map(cache => ({
      timestamp: cache.lastUsed,
      action: 'hit' as const,
      characterId: cache.characterId.toString(),
      characterName: (() => {
        const char = characters.find(c => c._id.toString() === cache.characterId.toString());
        return typeof char?.name === 'object' ? char?.name?.ja : char?.name || 'Unknown';
      })(),
      affinityLevel: cache.promptConfig.affinityLevel,
      generationTime: cache.generationTime,
      userId: cache.userId.toString()
    }));

    // トップパフォーマンスキャッシュ
    const topPerformingCaches = await getTopPerformingCaches(characters, 10);

    // 効率性スコア計算
    const cacheEfficiencyScore = calculateOverallEfficiencyScore(characterStats);

    return {
      totalCaches,
      totalHits,
      hitRatio,
      averageGenerationTime,
      totalMemoryUsage,
      cachesByCharacter: characterStats,
      recentActivity,
      topPerformingCaches,
      invalidationEvents: await getInvalidationEventCount(timeframe),
      cacheEfficiencyScore
    };

  } catch (error) {
    console.error('Cache performance metrics error:', error);
    throw error;
  }
}

/**
 * キャラクター別キャッシュ統計取得
 */
export async function getCacheStatsByCharacter(
  characters: any[],
  timeframe: number = 30
): Promise<CharacterCacheStats[]> {
  const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
  
  const characterStats = await Promise.all(
    characters.map(async (character) => {
      const caches = await CharacterPromptCache.find({
        characterId: character._id,
        lastUsed: { $gte: startDate },
        ttl: { $gt: new Date() }
      });

      const totalCaches = caches.length;
      const totalHits = caches.reduce((sum, cache) => sum + cache.useCount, 0);
      const hitRatio = totalCaches > 0 ? totalHits / totalCaches : 0;
      const averageGenerationTime = totalCaches > 0 ? 
        caches.reduce((sum, cache) => sum + cache.generationTime, 0) / totalCaches : 0;
      const memoryUsage = caches.reduce((sum, cache) => sum + cache.promptLength, 0);
      const lastUsed = caches.length > 0 ? 
        caches.reduce((latest, cache) => 
          cache.lastUsed > latest ? cache.lastUsed : latest, caches[0].lastUsed
        ) : new Date(0);

      // 親密度レベル分布
      const affinityLevelDistribution = getAffinityDistribution(caches);
      
      // 効率性計算
      const efficiency = calculateCacheEfficiency(caches);

      return {
        characterId: character._id.toString(),
        characterName: typeof character.name === 'object' ? character.name.ja : character.name,
        totalCaches,
        totalHits,
        hitRatio,
        averageGenerationTime,
        memoryUsage,
        lastUsed,
        efficiency,
        affinityLevelDistribution
      };
    })
  );

  return characterStats.sort((a, b) => b.efficiency - a.efficiency);
}

/**
 * 親密度レベル分布計算
 */
function getAffinityDistribution(caches: any[]): AffinityDistribution[] {
  const distributions = [
    { range: '0-20', min: 0, max: 20 },
    { range: '21-40', min: 21, max: 40 },
    { range: '41-60', min: 41, max: 60 },
    { range: '61-80', min: 61, max: 80 },
    { range: '81-100', min: 81, max: 100 }
  ];

  return distributions.map(dist => {
    const rangeCaches = caches.filter(cache => 
      cache.promptConfig.affinityLevel >= dist.min && 
      cache.promptConfig.affinityLevel <= dist.max
    );
    
    const count = rangeCaches.length;
    const totalHits = rangeCaches.reduce((sum, cache) => sum + cache.useCount, 0);
    const hitRatio = count > 0 ? totalHits / count : 0;

    return {
      affinityRange: dist.range,
      count,
      hitRatio
    };
  });
}

/**
 * キャッシュ効率性計算
 */
function calculateCacheEfficiency(caches: any[]): number {
  if (caches.length === 0) return 0;

  const totalScore = caches.reduce((score, cache) => {
    const usageScore = Math.min(cache.useCount / 10, 1); // 使用回数スコア
    const ageScore = calculateAgeScore(cache.createdAt); // 経過時間スコア
    const sizeScore = calculateSizeScore(cache.promptLength); // サイズ効率スコア
    
    return score + (usageScore * 0.5 + ageScore * 0.3 + sizeScore * 0.2);
  }, 0);

  return totalScore / caches.length;
}

/**
 * 経過時間スコア計算（新しいほど高スコア）
 */
function calculateAgeScore(createdAt: Date): number {
  const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - (daysSinceCreation / 30)); // 30日で0になる
}

/**
 * サイズ効率スコア計算
 */
function calculateSizeScore(promptLength: number): number {
  const optimalSize = 2000; // 最適なプロンプトサイズ
  const deviation = Math.abs(promptLength - optimalSize) / optimalSize;
  return Math.max(0, 1 - deviation);
}

/**
 * 総合効率性スコア計算
 */
function calculateOverallEfficiencyScore(characterStats: CharacterCacheStats[]): number {
  if (characterStats.length === 0) return 0;

  const totalScore = characterStats.reduce((score, stat) => {
    return score + (stat.efficiency * stat.totalCaches);
  }, 0);

  const totalCaches = characterStats.reduce((sum, stat) => sum + stat.totalCaches, 0);
  return totalCaches > 0 ? totalScore / totalCaches : 0;
}

/**
 * トップパフォーマンスキャッシュ取得
 */
export async function getTopPerformingCaches(
  characters: any[],
  limit: number = 10
): Promise<CacheEntry[]> {
  const topCaches = await CharacterPromptCache.find({
    ttl: { $gt: new Date() }
  }).sort({ 
    useCount: -1, 
    lastUsed: -1 
  }).limit(limit);

  return topCaches.map(cache => {
    const character = characters.find(c => c._id.toString() === cache.characterId.toString());
    const efficiency = cache.useCount / Math.max(1, 
      (Date.now() - cache.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      _id: (cache._id as any).toString(),
      characterId: cache.characterId.toString(),
      characterName: typeof character?.name === 'object' ? character?.name?.ja : character?.name || 'Unknown',
      affinityLevel: cache.promptConfig.affinityLevel,
      useCount: cache.useCount,
      efficiency,
      lastUsed: cache.lastUsed,
      memorySize: cache.promptLength,
      hitRatio: cache.useCount / Math.max(1, cache.useCount) // 簡易計算
    };
  });
}

/**
 * 無効化イベント数取得（簡易実装）
 */
async function getInvalidationEventCount(timeframe: number): Promise<number> {
  const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
  
  // 期限切れキャッシュ数をカウント（実際の無効化イベントの代用）
  const expiredCount = await CharacterPromptCache.countDocuments({
    ttl: { $lt: new Date(), $gte: startDate }
  });

  return expiredCount;
}

/**
 * キャッシュ無効化統計取得
 */
export async function getCacheInvalidationStats(
  timeframe: number = 30
): Promise<CacheInvalidationStats> {
  const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
  
  // 実際の実装では専用の無効化ログテーブルを使用
  const ttlExpired = await CharacterPromptCache.countDocuments({
    ttl: { $lt: new Date(), $gte: startDate }
  });

  // 使用回数が少ないキャッシュ（2回未満）
  const lowUsage = await CharacterPromptCache.countDocuments({
    useCount: { $lt: 2 },
    createdAt: { $gte: startDate }
  });

  // 平均寿命計算
  const allCaches = await CharacterPromptCache.find({
    createdAt: { $gte: startDate }
  }, 'createdAt lastUsed');

  const averageLifespan = allCaches.length > 0 ? 
    allCaches.reduce((sum, cache) => {
      const lifespan = cache.lastUsed.getTime() - cache.createdAt.getTime();
      return sum + lifespan;
    }, 0) / allCaches.length / (1000 * 60 * 60 * 24) : 0; // 日数に変換

  return {
    totalInvalidations: ttlExpired + lowUsage,
    byReason: {
      ttlExpired,
      characterUpdate: 0, // 実装では適切にカウント
      manual: 0, // 実装では適切にカウント
      lowUsage
    },
    averageLifespan,
    lastCleanup: new Date() // 実装では実際のクリーンアップ日時
  };
}

/**
 * キャッシュクリーンアップ実行
 */
export async function performCacheCleanup(): Promise<{
  deletedCount: number;
  memoryFreed: number;
  cleanupTime: number;
}> {
  const startTime = Date.now();
  
  try {
    // 期限切れキャッシュを取得してメモリ使用量を計算
    const expiredCaches = await CharacterPromptCache.find({
      $or: [
        { ttl: { $lt: new Date() } },
        { useCount: { $lt: 2 } },
        { lastUsed: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
      ]
    });

    const memoryFreed = expiredCaches.reduce((sum, cache) => sum + cache.promptLength, 0);
    
    // クリーンアップ実行
    const result = await CharacterPromptCache.deleteMany({
      $or: [
        { ttl: { $lt: new Date() } },
        { useCount: { $lt: 2 } },
        { lastUsed: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
      ]
    });

    const cleanupTime = Date.now() - startTime;

    return {
      deletedCount: result.deletedCount || 0,
      memoryFreed,
      cleanupTime
    };

  } catch (error) {
    console.error('Cache cleanup error:', error);
    throw error;
  }
}

/**
 * 特定キャラクターのキャッシュ無効化
 */
export async function invalidateCharacterCache(
  characterId: string,
  reason: string = 'manual'
): Promise<{
  deletedCount: number;
  memoryFreed: number;
}> {
  try {
    const caches = await CharacterPromptCache.find({ characterId });
    const memoryFreed = caches.reduce((sum, cache) => sum + cache.promptLength, 0);
    
    const result = await CharacterPromptCache.deleteMany({ characterId });

    console.log(`Cache invalidated for character ${characterId}: ${result.deletedCount} caches, reason: ${reason}`);

    return {
      deletedCount: result.deletedCount || 0,
      memoryFreed
    };

  } catch (error) {
    console.error('Character cache invalidation error:', error);
    throw error;
  }
}