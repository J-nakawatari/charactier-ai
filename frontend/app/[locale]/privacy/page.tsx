'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import { PrivacyContent } from '@/components/legal/PrivacyContent';

export default function PrivacyPage() {
  const t = useTranslations('sidebar.privacyModal');
  const params = useParams();
  const locale = params?.locale || 'ja';
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {locale === 'ja' ? 'ダッシュボードに戻る' : 'Back to Dashboard'}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-2">{t('lastUpdated')}</p>
        </div>

        {/* コンテンツ */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <PrivacyContent />
        </div>
      </div>
    </div>
  );
}