import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import log from '../utils/logger';

// Argon2id 設定
const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,       // 3回のイテレーション
  parallelism: 4,    // 4つの並列スレッド
  hashLength: 32,    // 256ビットのハッシュ
};

// パスワードハッシュのプレフィックス（ハッシュ形式の識別用）
const HASH_PREFIX = {
  ARGON2: '$argon2',
  BCRYPT: '$2a$',
};

/**
 * パスワードをハッシュ化（Argon2id使用）
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await argon2.hash(password, ARGON2_CONFIG);
    log.debug('Password hashed with Argon2id');
    return hash;
  } catch (error) {
    log.error('Argon2 hashing failed', error);
    throw new Error('Password hashing failed');
  }
}

/**
 * パスワードを検証（Argon2idとbcrypt両対応）
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // ハッシュ形式を判定
    if (hash.startsWith(HASH_PREFIX.ARGON2)) {
      // Argon2形式
      const isValid = await argon2.verify(hash, password);
      log.debug('Password verified with Argon2id', { valid: isValid });
      return isValid;
    } else if (hash.startsWith(HASH_PREFIX.BCRYPT)) {
      // bcrypt形式（移行期間用）
      const isValid = await bcrypt.compare(password, hash);
      log.debug('Password verified with bcrypt (legacy)', { valid: isValid });
      return isValid;
    } else {
      log.warn('Unknown password hash format', { hashPrefix: hash.substring(0, 4) });
      return false;
    }
  } catch (error) {
    log.error('Password verification failed', error);
    return false;
  }
}

/**
 * パスワードハッシュが再ハッシュ化が必要か確認
 */
export function needsRehash(hash: string): boolean {
  // bcrypt形式の場合は再ハッシュ化が必要
  if (hash.startsWith(HASH_PREFIX.BCRYPT)) {
    return true;
  }
  
  // Argon2形式でも設定が変更された場合は再ハッシュ化
  if (hash.startsWith(HASH_PREFIX.ARGON2)) {
    return argon2.needsRehash(hash, ARGON2_CONFIG);
  }
  
  return false;
}

/**
 * パスワード強度の検証
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 最小長
  if (password.length < 8) {
    errors.push('パスワードは8文字以上である必要があります');
  }
  
  // 最大長（DoS攻撃対策）
  if (password.length > 128) {
    errors.push('パスワードは128文字以下である必要があります');
  }
  
  // 複雑性チェック（オプション）
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const complexityScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar]
    .filter(Boolean).length;
  
  if (complexityScore < 2) {
    errors.push('パスワードは大文字、小文字、数字、特殊文字のうち2種類以上を含む必要があります');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * bcryptハッシュをArgon2idに移行
 */
export async function migratePasswordHash(
  userId: string,
  plainPassword: string,
  oldHash: string
): Promise<string | null> {
  try {
    // 古いハッシュで検証
    const isValid = await verifyPassword(plainPassword, oldHash);
    if (!isValid) {
      return null;
    }
    
    // 新しいハッシュを生成
    const newHash = await hashPassword(plainPassword);
    
    log.info('Password hash migrated to Argon2id', { 
      userId,
      oldFormat: oldHash.substring(0, 4),
      newFormat: newHash.substring(0, 8)
    });
    
    return newHash;
  } catch (error) {
    log.error('Password hash migration failed', error);
    return null;
  }
}

/**
 * ハッシュ統計情報の取得
 */
export function getHashInfo(hash: string): {
  algorithm: string;
  needsUpgrade: boolean;
} {
  if (hash.startsWith(HASH_PREFIX.ARGON2)) {
    return {
      algorithm: 'argon2id',
      needsUpgrade: argon2.needsRehash(hash, ARGON2_CONFIG)
    };
  } else if (hash.startsWith(HASH_PREFIX.BCRYPT)) {
    return {
      algorithm: 'bcrypt',
      needsUpgrade: true
    };
  } else {
    return {
      algorithm: 'unknown',
      needsUpgrade: true
    };
  }
}