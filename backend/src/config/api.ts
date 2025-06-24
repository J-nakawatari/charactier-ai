/**
 * API Configuration
 * 
 * 環境変数でAPIバージョンを管理
 * API_VERSIONを変更するだけで全てのエンドポイントが切り替わる
 */

// デフォルトはv1
const API_VERSION = process.env.API_VERSION || 'v1';

// APIプレフィックス（例: /api/v1）
export const API_PREFIX = `/api/${API_VERSION}` as const;

// デバッグ情報
console.log(`🚀 API Version: ${API_VERSION}`);
console.log(`🚀 API Prefix: ${API_PREFIX}`);

export default {
  API_VERSION,
  API_PREFIX
};