'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function useLocale(): string {
  const pathname = usePathname();
  const [locale, setLocale] = useState<string>('ja');
  
  useEffect(() => {
    // パスから言語を抽出 (/ja/... または /en/...)
    const segments = pathname.split('/');
    const pathLocale = segments[1];
    
    // サポートされている言語かチェック
    if (pathLocale === 'ja' || pathLocale === 'en') {
      setLocale(pathLocale);
      
      // ローカルストレージにも保存（フォールバック用）
      if (typeof window !== 'undefined') {
        localStorage.setItem('user-locale', pathLocale);
      }
    } else {
      // パスに言語がない場合、保存された言語を確認
      if (typeof window !== 'undefined') {
        const savedLocale = localStorage.getItem('user-locale');
        if (savedLocale === 'ja' || savedLocale === 'en') {
          setLocale(savedLocale);
        }
      }
    }
  }, [pathname]);
  
  return locale;
}