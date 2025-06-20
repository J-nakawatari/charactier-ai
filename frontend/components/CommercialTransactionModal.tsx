'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CommercialTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommercialTransactionModal({ isOpen, onClose }: CommercialTransactionModalProps) {
  const t = useTranslations('footer.commercialTransactionModal');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      <div className="relative w-full h-full bg-white overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 bg-white border-b">
          <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        
        <div className="max-w-4xl mx-auto p-6">
          <p className="text-sm text-gray-500 mb-8">{t('lastUpdated')}</p>
          
          <div className="prose prose-gray max-w-none">
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
                      {t('items.businessName.content')}<br />
                      <span className="text-xs text-gray-500">{t('items.businessName.note')}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.address.label')}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <span className="text-gray-500">{t('items.address.content')}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.phone.label')}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <span className="text-xs text-gray-500">{t('items.phone.note')}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.contact.label')}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {t('items.contact.content')}<br />
                      <a 
                        href={t('items.contact.url')} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-pink-500 underline hover:text-pink-600"
                      >
                        {t('items.contact.url')}
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.price.label')}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {t('items.price.content')}
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
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{t('items.subscription.label')}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {t('items.subscription.content')}
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
        
        <div className="sticky bottom-0 p-6 bg-white border-t">
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}