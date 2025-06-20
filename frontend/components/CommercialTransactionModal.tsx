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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">項目</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">事業者名</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      Charactier 運営事務局<br />
                      <span className="text-xs text-gray-500">※事業者の氏名は、請求があれば遅滞なく電子メールにより開示いたします。</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">所在地</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <span className="text-gray-500">〈バーチャルオフィス住所（確定後に記載）〉</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">電話番号</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <span className="text-xs text-gray-500">※請求があれば遅滞なく電子メールにより開示いたします。</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">お問い合わせ窓口</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      お問い合わせフォーム：<br />
                      <a 
                        href="https://forms.gle/ZkYUQSmpqxrQaa4m8" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-pink-500 underline hover:text-pink-600"
                      >
                        https://forms.gle/ZkYUQSmpqxrQaa4m8
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">販売価格</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      サービス内で表示された金額（消費税込）
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">支払方法</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      クレジットカード決済（Stripe を使用）
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">代金の支払時期</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      決済確定時に課金
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">商品の引渡時期</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      決済完了後、直ちにトークチケットを付与
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">返品・キャンセル</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      デジタル商品の特性上、購入後の返品・キャンセルはできません。
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">月額課金の解約</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      次回更新日の24時間前までにマイページから解約可能
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">不具合の対応</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      サービスが利用できない場合は、利用規約・プライバシーポリシーに基づき適切に対応します。
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