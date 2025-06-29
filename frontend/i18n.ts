import { getRequestConfig } from 'next-intl/server';

// サポートする言語
export const locales = ['ja', 'en'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  // localeがundefinedの場合はデフォルトを使用
  const validLocale = locale && locales.includes(locale as Locale) ? locale : 'ja';
  
  try {
    const messages = (await import(`./messages/${validLocale}.json`)).default;
    
    return {
      locale: validLocale,
      messages,
      // エラー処理を有効化
      onError(error) {
        if (error.code === 'MISSING_MESSAGE' && process.env.NODE_ENV === 'production') {
          // 本番環境ではエラーをログに記録して継続
          console.error(`[i18n] Missing message: ${error.originalMessage}`);
        }
      },
      // 存在しないキーの場合のフォールバック
      getMessageFallback({ namespace, key, error }) {
        const fullKey = [namespace, key].filter(Boolean).join('.');
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