'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';

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
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {t('introduction')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('section1.title')}</h2>
            <p className="text-gray-700">{t('section1.content')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('section2.title')}</h2>
            <ol className="space-y-2 text-gray-700">
              <li>{t('section2.item1')}</li>
              <li>{t('section2.item2')}</li>
              <li>{t('section2.item3')}</li>
              <li>{t('section2.item4')}</li>
              <li>{t('section2.item5')}</li>
              <li>{t('section2.item6')}</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('section3.title')}</h2>
            <p className="text-gray-700 mb-2">{t('section3.description')}</p>
            <ul className="space-y-1 text-gray-700 mb-4">
              <li>{t('section3.item1')}</li>
              <li>{t('section3.item2')}</li>
              <li>{t('section3.item3')}</li>
            </ul>
            <p className="text-gray-700">{t('section3.note')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('section4.title')}</h2>
            <p className="text-gray-700">{t('section4.content')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('section5.title')}</h2>
            <p className="text-gray-700">{t('section5.content')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('section6.title')}</h2>
            <p className="text-gray-700">{t('section6.content')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('section7.title')}</h2>
            <p className="text-gray-700">{t('section7.content')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('section8.title')}</h2>
            <p className="text-gray-700">{t('section8.content')}</p>
          </section>
        </div>
      </div>
    </div>
  );
}