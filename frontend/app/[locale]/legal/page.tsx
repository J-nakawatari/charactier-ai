'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function LegalPage() {
  const t = useTranslations('footer.commercialTransactionModal');
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
                  <td className="px-6 py-4 text-sm text-gray-700">
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
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.returns.label')}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {t('items.returns.content')}
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
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}