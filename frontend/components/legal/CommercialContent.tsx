'use client';

import { useTranslations } from 'next-intl';

export function CommercialContent() {
  const t = useTranslations('footer.commercialTransactionModal');

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tableHeaders.item')}</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tableHeaders.content')}</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.businessName.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.businessName.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.representative.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.representative.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.address.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700 whitespace-pre-wrap">
              {t('items.address.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.phone.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.phone.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.email.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.email.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.price.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.price.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.additionalFees.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.additionalFees.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.payment.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.payment.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.paymentTiming.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.paymentTiming.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.delivery.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.delivery.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.returnsAndExchange.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700 whitespace-pre-wrap">
              {t('items.returnsAndExchange.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.environment.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.environment.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.specialConditions.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.specialConditions.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.support.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.support.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.contact.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.contact.content')}
              <br />
              <a 
                href={t('items.contact.url')} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 underline"
              >
                {t('items.contact.url')}
              </a>
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.subscription.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.subscription.content')}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.phoneDisclosure.label')}</td>
            <td className="px-6 py-4 text-sm text-gray-700">
              {t('items.phoneDisclosure.content')}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}