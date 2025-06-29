'use client';

import { useTranslations } from 'next-intl';

export function PrivacyContent() {
  const t = useTranslations('sidebar.privacyModal');

  return (
    <div className="space-y-8">
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
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
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
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>{t('section3.item1')}</li>
          <li>{t('section3.item2')}</li>
          <li>{t('section3.item3')}</li>
        </ol>
        <p className="text-sm text-gray-600 mt-2">{t('section3.note')}</p>
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
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>{t('section7.item1')}</li>
          <li>{t('section7.item2')}</li>
          <li>{t('section7.item3')}</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('section8.title')}</h2>
        <p className="text-gray-700">{t('section8.content')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('section9.title')}</h2>
        <p className="text-gray-700">{t('section9.content')}</p>
      </section>
    </div>
  );
}