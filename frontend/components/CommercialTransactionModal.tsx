'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CommercialContent } from '@/components/legal/CommercialContent';

interface CommercialTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommercialTransactionModal({ isOpen, onClose }: CommercialTransactionModalProps) {
  const t = useTranslations('sidebar.commercialModal');
  const tClose = useTranslations('sidebar.termsModal'); // 閉じるボタンの翻訳を借用

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
          
          <CommercialContent />
        </div>
        
        <div className="sticky bottom-0 p-6 bg-white border-t">
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
            >
              {tClose('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}