'use client';

import { useTranslations } from 'next-intl';
import { CommercialContent } from '@/components/legal/CommercialContent';

export default function LegalPage() {
  const t = useTranslations('footer.commercialTransactionModal');
  
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-2">{t('lastUpdated')}</p>
        </div>
        
        <div className="prose prose-gray max-w-none">
          <CommercialContent />
        </div>
      </div>
    </div>
  );
}