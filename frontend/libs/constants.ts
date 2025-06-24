// API関連の定数
export const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
export const API_BASE_URL = `/api/${API_VERSION}`;

// その他の定数
export const DEFAULT_LOCALE = 'ja';
export const SUPPORTED_LOCALES = ['ja', 'en'] as const;