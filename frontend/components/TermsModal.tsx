'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
  const t = useTranslations('sidebar.termsModal');

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

            <h3 className="text-xl font-semibold mb-4">{t('article1.title')}</h3>
            <div className="text-gray-700 mb-6">
              <p className="mb-2">{t('article1.content1')}</p>
              <p>{t('article1.content2')}</p>
            </div>

            <h3 className="text-xl font-semibold mb-4">{t('article2.title')}</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>{t('article2.item1')}</li>
              <li>{t('article2.item2')}</li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">{t('article3.title')}</h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>{t('article3.item1')}</li>
              <li>{t('article3.item2')}</li>
              <li>{t('article3.item3')}</li>
              <li>{t('article3.item4')}</li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">{t('article4.title')}</h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>{t('article4.item1')}</li>
              <li>{t('article4.item2')}</li>
              <li>{t('article4.item3')}</li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">{t('article5.title')}</h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>{t('article5.item1')}</li>
              <li>{t('article5.item2')}</li>
              <li>{t('article5.item3')}</li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">{t('article6.title')}</h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>{t('article6.item1')}</li>
              <li>{t('article6.item2')}</li>
              <li>{t('article6.item3')}</li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">{t('article7.title')}</h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>{t('article7.item1')}</li>
              <li className="font-bold">{t('article7.item2')}</li>
              <li>{t('article7.item3')}</li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">{t('article8.title')}</h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>{t('article8.item1')}</li>
              <li>{t('article8.item2')}</li>
              <li>{t('article8.item3')}</li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">{t('article9.title')}</h3>
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">
              {t('article9.content')}
            </p>

            <h3 className="text-xl font-semibold mb-4">{t('article10.title')}</h3>
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">
              {t('article10.content')}
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