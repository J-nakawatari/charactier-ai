/**
 * Feature Flags Configuration
 * 
 * このファイルは、段階的な機能展開のためのFeature Flagを管理します。
 * 環境変数で制御し、本番環境への影響を最小限に抑えながら新機能をテストできます。
 */

import log from '../utils/logger';

// Feature Flag定義
export interface FeatureFlags {
  // JWT保存方式の変更フラグ
  SECURE_COOKIE_AUTH: boolean;
  
  // CSRF SameSite設定フラグ
  CSRF_SAMESITE_STRICT: boolean;
  
  // Joi検証強化フラグ
  STRICT_JOI_VALIDATION: boolean;
  
  // 不明フィールドの警告ログフラグ
  LOG_UNKNOWN_FIELDS: boolean;
}

// デフォルト値は getFeatureFlags() 内で直接設定

// Cookie設定の型定義
export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
  domain?: string;
}

// 環境変数からFeature Flagを読み込む
export function getFeatureFlags(): FeatureFlags {
  const flags: FeatureFlags = {
    SECURE_COOKIE_AUTH: process.env.FEATURE_SECURE_COOKIE_AUTH === 'true',
    CSRF_SAMESITE_STRICT: process.env.FEATURE_CSRF_SAMESITE_STRICT === 'true',
    STRICT_JOI_VALIDATION: process.env.FEATURE_STRICT_JOI_VALIDATION === 'true',
    LOG_UNKNOWN_FIELDS: process.env.FEATURE_LOG_UNKNOWN_FIELDS === 'true'
  };
  
  // 起動時にFeature Flagの状態をログ出力
  log.info('🚀 Feature Flags Status', {
    SECURE_COOKIE_AUTH: flags.SECURE_COOKIE_AUTH,
    CSRF_SAMESITE_STRICT: flags.CSRF_SAMESITE_STRICT,
    STRICT_JOI_VALIDATION: flags.STRICT_JOI_VALIDATION,
    LOG_UNKNOWN_FIELDS: flags.LOG_UNKNOWN_FIELDS,
    environment: process.env.NODE_ENV
  });
  
  return flags;
}

// 特定のFeature Flagが有効かチェック
export function isFeatureEnabled(flagName: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[flagName];
}

// Cookie設定を取得（Feature Flagに基づく）
export function getCookieConfig(isProduction: boolean = process.env.NODE_ENV === 'production'): CookieOptions {
  const flags = getFeatureFlags();
  
  if (flags.SECURE_COOKIE_AUTH) {
    // 新方式: httpOnly + secure + sameSite
    const options: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: flags.CSRF_SAMESITE_STRICT ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      path: '/'
    };
    return options;
  } else {
    // 従来方式: フロントエンドからアクセス可能
    const options: CookieOptions = {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      path: '/'
    };
    return options;
  }
}

// リフレッシュトークンのCookie設定
export function getRefreshCookieConfig(isProduction: boolean = process.env.NODE_ENV === 'production'): CookieOptions {
  const flags = getFeatureFlags();
  
  const options: CookieOptions = {
    httpOnly: true, // リフレッシュトークンは常にhttpOnly
    secure: isProduction,
    sameSite: flags.CSRF_SAMESITE_STRICT ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
    path: '/'
  };
  
  return options;
}

// Joi検証オプションを取得
export function getJoiValidationOptions() {
  const flags = getFeatureFlags();
  
  return {
    abortEarly: false,
    stripUnknown: !flags.STRICT_JOI_VALIDATION, // 厳格モードでは不明フィールドを削除しない
    allowUnknown: !flags.STRICT_JOI_VALIDATION, // 厳格モードでは不明フィールドを許可しない
    presence: 'required' as const,
    convert: true
  };
}

// 初期化時にFeature Flagをログ出力
export function initializeFeatureFlags(): void {
  getFeatureFlags();
}