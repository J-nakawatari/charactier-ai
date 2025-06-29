'use client';

import { useTranslations } from 'next-intl';

export function TermsContent() {
  const t = useTranslations('sidebar.termsModal');

  return (
    <div className="space-y-8">
      <section>
        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
          {t('introduction')}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('article1.title')}</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>{t('article1.content1')}</li>
          <li>{t('article1.content2')}</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('article2.title')}</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>{t('article2.item1')}</li>
          <li>{t('article2.item2')}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('article3.title')}</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>{t('article3.item1')}</li>
          <li>{t('article3.item2')}</li>
          <li>{t('article3.item3')}</li>
          <li>{t('article3.item4')}</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('article4.title')}</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>{t('article4.item1')}</li>
          <li>{t('article4.item2')}</li>
          <li>{t('article4.item3')}</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('article5.title')}</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>{t('article5.item1')}</li>
          <li>{t('article5.item2')}</li>
          <li>{t('article5.item3')}</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('article6.title')}</h2>
        <p className="text-gray-700 mb-2">{t('article6.intro')}</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>{t('article6.item1')}</li>
          <li>{t('article6.item2')}</li>
          <li>{t('article6.item3')}</li>
          <li>{t('article6.item4')}</li>
          <li>{t('article6.item5')}</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('article7.title')}</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>{t('article7.item1')}</li>
          <li>{t('article7.item2')}</li>
          <li>{t('article7.item3')}</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('article8.title')}</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>{t('article8.item1')}</li>
          <li>{t('article8.item2')}</li>
          <li>{t('article8.item3')}</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('article9.title')}</h2>
        <p className="text-gray-700">{t('article9.content')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('article10.title')}</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>{t('article10.content1')}</li>
          <li>{t('article10.content2')}</li>
          <li>{t('article10.content3')}</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('article11.title')}</h2>
        <p className="text-gray-700">{t('article11.content')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('article12.title')}</h2>
        <p className="text-gray-700">{t('article12.content')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('article13.title')}</h2>
        <p className="text-gray-700">{t('article13.content')}</p>
      </section>
    </div>
  );
}