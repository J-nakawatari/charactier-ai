import { getRequestConfig } from 'next-intl/server';
import { flattenMessages, logAllKeys } from './src/i18n/flattenMessages';

// サポートする言語
export const locales = ['ja', 'en'] as const;
export type Locale = (typeof locales)[number];

// 開発環境でのデバッグフラグ
const DEBUG = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_I18N_DEBUG === 'true';

export default getRequestConfig(async ({ locale }) => {
  // localeがundefinedの場合はデフォルトを使用
  const validLocale = locale && locales.includes(locale as Locale) ? locale : 'ja';
  
  try {
    const messages = (await import(`./messages/${validLocale}.json`)).default;
    
    // デバッグモードの場合、利用可能なキーをログ出力
    if (DEBUG) {
      logAllKeys(messages, validLocale);
    }

    // メッセージをフラット化して返す（next-intl v3互換性のため）
    const flattenedMessages = flattenMessages(messages);
    
    return {
      locale: validLocale,
      messages: flattenedMessages,
      // エラー処理を有効化
      onError(error) {
        if (error.code === 'MISSING_MESSAGE') {
          console.error(`[i18n] Missing message: ${error.originalMessage}`);
        }
      },
      // 存在しないキーの場合のフォールバック
      getMessageFallback({ namespace, key, error }) {
        const fullKey = [namespace, key].filter(Boolean).join('.');
        if (DEBUG) {
          return `[MISSING: ${fullKey}]`;
        }
        return fullKey;
      }
    };
  } catch (error) {
    console.error(`[i18n] Failed to load messages for locale "${validLocale}":`, error);
    // フォールバックとして空のメッセージを返す
    return {
      locale: validLocale,
      messages: {}
    };
  }
});