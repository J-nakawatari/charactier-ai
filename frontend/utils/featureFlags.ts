/**
 * Feature Flags Client Utility
 * バックエンドのFeature Flag設定を取得・キャッシュする
 */

import { API_BASE_URL } from '@/lib/api-config';

export interface FeatureFlags {
  SECURE_COOKIE_AUTH: boolean;
}

let cachedFlags: FeatureFlags | null = null;
let cacheExpiry: number = 0;

/**
 * Feature Flagsを取得（キャッシュ付き）
 * @param forceRefresh キャッシュを無視して強制的に取得
 */
export async function getFeatureFlags(forceRefresh = false): Promise<FeatureFlags> {
  const now = Date.now();
  
  // キャッシュが有効な場合は返す
  if (!forceRefresh && cachedFlags && now < cacheExpiry) {
    return cachedFlags;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/feature-flags/public`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch feature flags');
    }
    
    const data = await response.json();
    
    // キャッシュに保存（5分間）
    cachedFlags = data.flags;
    cacheExpiry = now + 5 * 60 * 1000;
    
    return data.flags;
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    
    // エラー時はデフォルト値を返す
    return {
      SECURE_COOKIE_AUTH: false,
    };
  }
}

/**
 * 特定のFeature Flagが有効かチェック
 */
export async function isFeatureEnabled(flagName: keyof FeatureFlags): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[flagName] || false;
}

/**
 * キャッシュをクリア
 */
export function clearFeatureFlagsCache(): void {
  cachedFlags = null;
  cacheExpiry = 0;
}