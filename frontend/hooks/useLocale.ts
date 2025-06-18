'use client';

import { usePathname } from 'next/navigation';

export function useLocale(): string {
  const pathname = usePathname();
  
  // パスから言語を抽出 (/ja/... または /en/...)
  const segments = pathname.split('/');
  const locale = segments[1];
  
  // サポートされている言語かチェック
  if (locale === 'ja' || locale === 'en') {
    return locale;
  }
  
  // デフォルトは日本語
  return 'ja';
}