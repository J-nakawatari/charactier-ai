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
            <h3 className="text-xl font-semibold mb-4">第1条（本規約の適用）</h3>
            <p className="text-gray-700 mb-6">
              本利用規約（以下「本規約」といいます。）は、Charactier AI（以下「当サービス」といいます。）の利用に関する条件を定めるものです。
              ユーザーの皆様には、本規約に同意いただいた上で、当サービスをご利用いただきます。
            </p>

            <h3 className="text-xl font-semibold mb-4">第2条（利用登録）</h3>
            <p className="text-gray-700 mb-6">
              利用登録を希望する方は、当サービスの定める方法により利用登録を申請し、当サービスがこれを承認することによって、利用登録が完了するものとします。
            </p>

            <h3 className="text-xl font-semibold mb-4">第3条（トークンの購入と利用）</h3>
            <p className="text-gray-700 mb-6">
              ユーザーは、当サービス内でトークンを購入し、キャラクターとのチャットに利用することができます。
              購入したトークンの返金は原則として行いません。
            </p>

            <h3 className="text-xl font-semibold mb-4">第4条（禁止事項）</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当サービスのサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
              <li>当サービスの運営を妨害するおそれのある行為</li>
              <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>当サービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">第5条（本サービスの提供の停止等）</h3>
            <p className="text-gray-700 mb-6">
              当サービスは、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
            </p>

            <h3 className="text-xl font-semibold mb-4">第6条（免責事項）</h3>
            <p className="text-gray-700 mb-6">
              当サービスは、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。
            </p>

            <h3 className="text-xl font-semibold mb-4">第7条（利用規約の変更）</h3>
            <p className="text-gray-700 mb-6">
              当サービスは、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
            </p>

            <h3 className="text-xl font-semibold mb-4">第8条（準拠法・裁判管轄）</h3>
            <p className="text-gray-700 mb-6">
              本規約の解釈にあたっては、日本法を準拠法とします。
              本サービスに関して紛争が生じた場合には、当サービスの本店所在地を管轄する裁判所を専属的合意管轄とします。
            </p>
          </div>
        </div>
        
        <div className="sticky bottom-0 p-6 bg-white border-t">
          <button
            onClick={onClose}
            className="w-full md:w-auto px-8 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}