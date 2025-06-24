'use client';

import { useState, useEffect } from 'react';

interface ExchangeRate {
  usdToJpy: number;
  jpyToUsd: number;
}

interface PriceDisplayProps {
  priceJpy: number;
  locale: string;
  className?: string;
}

export function PriceDisplay({ priceJpy, locale, className = '' }: PriceDisplayProps) {
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  
  useEffect(() => {
    // 英語ロケールの場合のみ為替レートを取得
    if (locale === 'en') {
      fetchExchangeRate();
    }
  }, [locale]);
  
  const fetchExchangeRate = async () => {
    try {
      const response = await fetch('/api/v1/exchange-rate');
      const data = await response.json();
      
      if (data.success) {
        setExchangeRate({
          usdToJpy: data.usdToJpy,
          jpyToUsd: data.jpyToUsd
        });
      } else if (data.fallback) {
        setExchangeRate({
          usdToJpy: data.fallback.usdToJpy,
          jpyToUsd: data.fallback.jpyToUsd
        });
      }
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
      // フォールバック値を設定
      setExchangeRate({
        usdToJpy: 150,
        jpyToUsd: 1 / 150
      });
    }
  };
  
  if (locale === 'ja') {
    // 日本語の場合は円のみ表示
    return (
      <span className={className}>
        ¥{priceJpy.toLocaleString()}
      </span>
    );
  }
  
  if (locale === 'en') {
    // 英語の場合は円 + ドル表示
    const priceUsd = exchangeRate 
      ? (priceJpy * exchangeRate.jpyToUsd).toFixed(2)
      : (priceJpy / 150).toFixed(2); // フォールバック
    
    return (
      <span className={className}>
        ¥{priceJpy.toLocaleString()} 
        <span className="text-sm text-gray-500 ml-1">
          (about ${priceUsd})
        </span>
      </span>
    );
  }
  
  // その他のロケールは円のみ
  return (
    <span className={className}>
      ¥{priceJpy.toLocaleString()}
    </span>
  );
}