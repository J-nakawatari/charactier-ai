'use client';

interface LocalizedTextProps {
  locale: string;
  ja: string;
  en: string;
  className?: string;
}

export function LocalizedText({ locale, ja, en, className = '' }: LocalizedTextProps) {
  const text = locale === 'en' ? en : ja;
  
  return (
    <span className={className}>
      {text}
    </span>
  );
}