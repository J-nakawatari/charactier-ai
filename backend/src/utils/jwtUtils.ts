/**
 * JWT関連のユーティリティ
 * トークンサイズを最小化するための最適化実装
 */

import jwt from 'jsonwebtoken';
import { getDecryptedJwtSecret } from '../services/jwtEncryption';
import log from './logger';

// コンパクトなJWTペイロード
export interface CompactTokenPayload {
  id: string; // userIdを短縮
  t?: 'user' | 'admin'; // typeを短縮
  exp?: number;
  iat?: number;
}

// 拡張ペイロード（必要な場合のみ）
export interface ExtendedTokenPayload extends CompactTokenPayload {
  role?: string;
  permissions?: string[];
}

/**
 * コンパクトなアクセストークンを生成
 * @param userId ユーザーID
 * @param type ユーザータイプ
 * @param expiresIn 有効期限（デフォルト: 15分）
 */
export function generateCompactAccessToken(
  userId: string, 
  type: 'user' | 'admin' = 'user',
  expiresIn: string = '15m'
): string {
  const payload: CompactTokenPayload = {
    id: userId,
    t: type
  };
  
  const secret = getDecryptedJwtSecret();
  const token = jwt.sign(payload, secret, { 
    expiresIn,
    algorithm: 'HS256' // デフォルトのHS256を明示
  } as jwt.SignOptions);
  
  // トークンサイズをログ
  log.debug('Generated compact access token', {
    userId,
    type,
    tokenSize: token.length,
    expiresIn
  });
  
  return token;
}

/**
 * コンパクトなリフレッシュトークンを生成
 * @param userId ユーザーID
 * @param type ユーザータイプ
 * @param expiresIn 有効期限（デフォルト: 7日）
 */
export function generateCompactRefreshToken(
  userId: string,
  type: 'user' | 'admin' = 'user',
  expiresIn: string = '7d'
): string {
  const payload: CompactTokenPayload = {
    id: userId,
    t: type
  };
  
  const refreshSecret = process.env.JWT_REFRESH_SECRET || getDecryptedJwtSecret();
  const token = jwt.sign(payload, refreshSecret, { 
    expiresIn,
    algorithm: 'HS256'
  } as jwt.SignOptions);
  
  log.debug('Generated compact refresh token', {
    userId,
    type,
    tokenSize: token.length,
    expiresIn
  });
  
  return token;
}

/**
 * トークンを検証して展開
 * @param token JWTトークン
 * @param isRefreshToken リフレッシュトークンかどうか
 */
export function verifyCompactToken(token: string, isRefreshToken: boolean = false): CompactTokenPayload {
  const secret = isRefreshToken 
    ? (process.env.JWT_REFRESH_SECRET || getDecryptedJwtSecret())
    : getDecryptedJwtSecret();
    
  return jwt.verify(token, secret) as CompactTokenPayload;
}

/**
 * 既存のトークンから新しいコンパクトトークンを生成
 * （移行用）
 */
export function migrateToCompactToken(oldToken: string, isRefreshToken: boolean = false): string | null {
  try {
    const decoded = jwt.decode(oldToken) as any;
    if (!decoded || !decoded.userId) {
      return null;
    }
    
    const type = decoded.isAdmin ? 'admin' : 'user';
    
    if (isRefreshToken) {
      return generateCompactRefreshToken(decoded.userId, type);
    } else {
      return generateCompactAccessToken(decoded.userId, type);
    }
  } catch (error) {
    log.error('Failed to migrate token', error);
    return null;
  }
}

/**
 * トークンサイズの分析
 */
export function analyzeTokenSize(token: string): {
  totalSize: number;
  headerSize: number;
  payloadSize: number;
  signatureSize: number;
} {
  const parts = token.split('.');
  
  return {
    totalSize: token.length,
    headerSize: parts[0]?.length || 0,
    payloadSize: parts[1]?.length || 0,
    signatureSize: parts[2]?.length || 0
  };
}

/**
 * JWTトークンのサイズ推定
 * @param payload ペイロード
 * @returns 推定サイズ（バイト）
 */
export function estimateJwtSize(payload: any): number {
  // Base64エンコード後のサイズを推定
  const jsonString = JSON.stringify(payload);
  const base64Size = Math.ceil(jsonString.length * 4 / 3);
  
  // ヘッダー（約100バイト）+ ペイロード + 署名（約43バイト）
  return 100 + base64Size + 43;
}