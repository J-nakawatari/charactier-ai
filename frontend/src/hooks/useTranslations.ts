import { useTranslations as useNextIntlTranslations } from 'next-intl';
import { trackTranslationKey } from '@/middleware/logger';

/**
 * 型安全な翻訳フック（デバッグ機能付き）
 */
export function useTranslations(namespace?: string) {
  const t = useNextIntlTranslations(namespace);
  const isDevelopment = process.env.NODE_ENV === 'development';

  // デバッグモードでは翻訳キーの使用を追跡
  if (isDevelopment) {
    return new Proxy(t, {
      apply(target, thisArg, args) {
        const key = args[0] as string;
        const fullKey = namespace ? `${namespace}.${key}` : key;
        
        try {
          const result = Reflect.apply(target, thisArg, args);
          trackTranslationKey(fullKey, true, 'ja'); // TODO: 実際のlocaleを取得
          return result;
        } catch (error) {
          trackTranslationKey(fullKey, false, 'ja'); // TODO: 実際のlocaleを取得
          throw error;
        }
      }
    });
  }

  return t;
}