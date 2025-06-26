import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import log from '../utils/logger';

// 暗号化設定
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

// 暗号化キーの保存パス
const KEY_FILE_PATH = path.join(process.cwd(), '.jwt-encryption-key');

/**
 * マスターキーの生成または読み込み
 * 本番環境では環境変数から、開発環境ではファイルから読み込み
 */
function getMasterKey(): Buffer {
  // 環境変数から取得を優先
  if (process.env.JWT_ENCRYPTION_KEY) {
    const key = Buffer.from(process.env.JWT_ENCRYPTION_KEY, 'hex');
    if (key.length !== KEY_LENGTH) {
      throw new Error('Invalid JWT_ENCRYPTION_KEY length. Expected 32 bytes (64 hex characters)');
    }
    return key;
  }

  // 開発環境: ファイルベースのキー管理
  if (process.env.NODE_ENV !== 'production') {
    try {
      // 既存のキーを読み込み
      if (fs.existsSync(KEY_FILE_PATH)) {
        const keyHex = fs.readFileSync(KEY_FILE_PATH, 'utf8').trim();
        const key = Buffer.from(keyHex, 'hex');
        if (key.length === KEY_LENGTH) {
          return key;
        }
      }

      // 新しいキーを生成して保存
      const newKey = crypto.randomBytes(KEY_LENGTH);
      fs.writeFileSync(KEY_FILE_PATH, newKey.toString('hex'), { mode: 0o600 });
      log.info('Generated new JWT encryption key for development');
      return newKey;

    } catch (error) {
      log.error('Failed to manage JWT encryption key file', error);
      throw new Error('Failed to initialize JWT encryption');
    }
  }

  // 本番環境では環境変数が必須
  throw new Error('JWT_ENCRYPTION_KEY environment variable is required in production');
}

/**
 * JWT秘密鍵を暗号化
 */
export function encryptJwtSecret(secret: string): {
  encrypted: string;
  salt: string;
  iv: string;
  tag: string;
} {
  try {
    const masterKey = getMasterKey();
    
    // ランダムなsaltとIVを生成
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // saltとマスターキーから暗号化キーを導出
    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');

    // 暗号化
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final()
    ]);

    // 認証タグを取得
    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('base64'),
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64')
    };
  } catch (error) {
    log.error('Failed to encrypt JWT secret', error);
    throw new Error('JWT secret encryption failed');
  }
}

/**
 * JWT秘密鍵を復号化
 */
export function decryptJwtSecret(encryptedData: {
  encrypted: string;
  salt: string;
  iv: string;
  tag: string;
}): string {
  try {
    const masterKey = getMasterKey();

    // Base64デコード
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64');

    // saltとマスターキーから暗号化キーを導出
    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');

    // 復号化
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    log.error('Failed to decrypt JWT secret', error);
    throw new Error('JWT secret decryption failed');
  }
}

/**
 * 暗号化されたJWT秘密鍵を環境変数から取得して復号化
 */
export function getDecryptedJwtSecret(): string {
  // 暗号化が無効な場合は直接返す
  if (process.env.JWT_SECRET_ENCRYPTED !== 'true') {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return secret;
  }

  // 暗号化されたデータを環境変数から取得
  const encryptedData = {
    encrypted: process.env.JWT_SECRET_ENCRYPTED_DATA,
    salt: process.env.JWT_SECRET_SALT,
    iv: process.env.JWT_SECRET_IV,
    tag: process.env.JWT_SECRET_TAG
  };

  // 必須フィールドの確認
  if (!encryptedData.encrypted || !encryptedData.salt || !encryptedData.iv || !encryptedData.tag) {
    throw new Error('Encrypted JWT secret data is incomplete');
  }

  // 復号化して返す
  return decryptJwtSecret(encryptedData as any);
}

/**
 * 拡張版トークン生成（暗号化対応）
 */
export function generateEncryptedAccessToken(userId: string): string {
  const secret = getDecryptedJwtSecret();
  return jwt.sign({ userId }, secret, { expiresIn: '24h' });
}

/**
 * 拡張版リフレッシュトークン生成（暗号化対応）
 */
export function generateEncryptedRefreshToken(userId: string): string {
  const refreshSecret = process.env.JWT_REFRESH_SECRET_ENCRYPTED === 'true'
    ? getDecryptedJwtSecret() // リフレッシュトークンも同じ暗号化秘密鍵を使用
    : (process.env.JWT_REFRESH_SECRET || getDecryptedJwtSecret());
  
  return jwt.sign({ userId }, refreshSecret, { expiresIn: '7d' });
}

/**
 * 拡張版トークン検証（暗号化対応）
 */
export function verifyEncryptedToken(token: string): any {
  const secret = getDecryptedJwtSecret();
  return jwt.verify(token, secret);
}

/**
 * セットアップユーティリティ: JWT秘密鍵を暗号化して環境変数形式で出力
 */
export function setupEncryptedJwtSecret(plainSecret: string): void {
  const encrypted = encryptJwtSecret(plainSecret);
  
  console.log('\n=== 暗号化されたJWT秘密鍵 ===');
  console.log('以下の環境変数を設定してください:\n');
  console.log(`JWT_SECRET_ENCRYPTED=true`);
  console.log(`JWT_SECRET_ENCRYPTED_DATA=${encrypted.encrypted}`);
  console.log(`JWT_SECRET_SALT=${encrypted.salt}`);
  console.log(`JWT_SECRET_IV=${encrypted.iv}`);
  console.log(`JWT_SECRET_TAG=${encrypted.tag}`);
  console.log('\n=== 重要 ===');
  console.log(`JWT_ENCRYPTION_KEY=${getMasterKey().toString('hex')}`);
  console.log('↑ この値は安全に保管し、本番環境の環境変数に設定してください');
  console.log('================\n');
}