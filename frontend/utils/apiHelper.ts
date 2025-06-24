/**
 * API Helper Functions
 * 環境変数ベースのAPIバージョン管理
 */

// API Version from environment variable
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';

/**
 * APIパスを生成する
 * @param path - APIパス（例: '/user/dashboard'）
 * @returns 完全なAPIパス（例: '/api/v1/user/dashboard'）
 */
export const getApiPath = (path: string): string => {
  // パスが既に/api/で始まっている場合はそのまま返す
  if (path.startsWith('/api/')) {
    return path;
  }
  
  // 先頭の/を削除
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `/api/${API_VERSION}${cleanPath}`;
};

/**
 * APIベースURLを取得
 * @returns APIベースURL（例: '/api/v1'）
 */
export const getApiBaseUrl = (): string => {
  return `/api/${API_VERSION}`;
};

/**
 * フルAPIエンドポイントURLを取得（バックエンドURL含む）
 * @param path - APIパス
 * @returns 完全なURL
 */
export const getFullApiUrl = (path: string): string => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  const apiPath = getApiPath(path);
  return `${backendUrl}${apiPath}`;
};

// デバッグ情報
console.log(`🔗 API Helper initialized with version: ${API_VERSION}`);