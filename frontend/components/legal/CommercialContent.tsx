'use client';

import { useTranslations } from 'next-intl';

export function CommercialContent() {
  const t = useTranslations('sidebar.commercialModal');

  const renderSection = (key: string, label: string, content: string, url?: string) => (
    <div className="border-b border-gray-200 pb-4">
      <dt className="font-medium text-gray-900 mb-2">{label}</dt>
      <dd className="text-gray-700">
        {content}
        {url && (
          <>
            <br />
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 underline"
            >
              {url}
            </a>
          </>
        )}
      </dd>
    </div>
  );

  return (
    <div className="space-y-8">
      <section>
        <p className="text-gray-700 leading-relaxed">
          {t('introduction')}
        </p>
      </section>

      <dl className="space-y-4">
        {renderSection('provider', t('sections.provider.label'), t('sections.provider.content'))}
        {renderSection('manager', t('sections.manager.label'), t('sections.manager.content'))}
        {renderSection('contact', t('sections.contact.label'), t('sections.contact.content'), t('sections.contact.url'))}
        {renderSection('price', t('sections.price.label'), t('sections.price.content'))}
        {renderSection('payment', t('sections.payment.label'), t('sections.payment.content'))}
        {renderSection('delivery', t('sections.delivery.label'), t('sections.delivery.content'))}
        {renderSection('timing', t('sections.timing.label'), t('sections.timing.content'))}
        {renderSection('refund', t('sections.refund.label'), t('sections.refund.content'))}
        {renderSection('currency', t('sections.currency.label'), t('sections.currency.content'))}
        {renderSection('validity', t('sections.validity.label'), t('sections.validity.content'))}
        {renderSection('required', t('sections.required.label'), t('sections.required.content'))}
        {renderSection('defect', t('sections.defect.label'), t('sections.defect.content'))}
        {renderSection('special', t('sections.special.label'), t('sections.special.content'))}
        {renderSection('support', t('sections.support.label'), t('sections.support.content'))}
        {renderSection('subscription', t('sections.subscription.label'), t('sections.subscription.content'))}
      </dl>
    </div>
  );
}