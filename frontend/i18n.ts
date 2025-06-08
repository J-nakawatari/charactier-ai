import { getRequestConfig } from 'next-intl/server';

// サポートする言語
export const locales = ['ja', 'en'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  // localeがundefinedの場合はデフォルトを使用
  const validLocale = locale && locales.includes(locale as Locale) ? locale : 'ja';
  
  return {
    locale: validLocale,
    messages: (await import(`./messages/${validLocale}.json`)).default
  };
});