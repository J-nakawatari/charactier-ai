'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  const t = useTranslations('sidebar.privacyModal');

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
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">
              {t('introduction')}
            </p>

            <h3 className="text-xl font-semibold mb-4">{t('section1.title')}</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>{t('section1.item1')}</li>
              <li>{t('section1.item2')}</li>
              <li>{t('section1.item3')}</li>
              <li>{t('section1.item4')}</li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">{t('section2.title')}</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>{t('section2.item1')}</li>
              <li>{t('section2.item2')}</li>
              <li>{t('section2.item3')}</li>
              <li>{t('section2.item4')}</li>
              <li>{t('section2.item5')}</li>
              <li>{t('section2.item6')}</li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">{t('section3.title')}</h3>
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">
              {t('section3.description')}
            </p>

            <div className="overflow-x-auto mb-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('section3.tableHeaders.destination')}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('section3.tableHeaders.information')}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('section3.tableHeaders.purpose')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{t('section3.services.ga4.name')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t('section3.services.ga4.info')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t('section3.services.ga4.purpose')}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{t('section3.services.stripe.name')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t('section3.services.stripe.info')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t('section3.services.stripe.purpose')}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{t('section3.services.cloudflare.name')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t('section3.services.cloudflare.info')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t('section3.services.cloudflare.purpose')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm font-semibold text-gray-900 mb-2">{t('section3.optOut.title')}</p>
              <p className="text-sm text-gray-700">
                {t('section3.optOut.description').split('Google Analytics').map((part, index) => (
                  index === 0 ? part : (
                    <span key={index}>
                      <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-pink-500 underline hover:text-pink-600">Google Analytics</a>
                      {part}
                    </span>
                  )
                ))}
              </p>
            </div>

            <h3 className="text-xl font-semibold mb-4">{t('section4.title')}</h3>
            <p className="text-gray-700 mb-2">{t('section4.description')}</p>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>{t('section4.item1')}</li>
              <li>{t('section4.item2')}</li>
              <li>{t('section4.item3')}</li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">{t('section5.title')}</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>{t('section5.item1')}</li>
              <li>{t('section5.item2')}</li>
              <li>{t('section5.item3')}</li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">{t('section6.title')}</h3>
            <p className="text-gray-700 mb-6">
              {t('section6.content')}<br />
              {t('section6.contactForm')}<a href="https://forms.gle/ZkYUQSmpqxrQaa4m8" target="_blank" rel="noopener noreferrer" className="text-pink-500 underline hover:text-pink-600">https://forms.gle/ZkYUQSmpqxrQaa4m8</a>
            </p>

            <h3 className="text-xl font-semibold mb-4">{t('section7.title')}</h3>
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">
              {t('section7.content')}
            </p>

            <h3 className="text-xl font-semibold mb-4">{t('section8.title')}</h3>
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">
              {t('section8.content')}
            </p>
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