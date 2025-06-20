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
            <h3 className="text-xl font-semibold mb-4">1. 個人情報の収集</h3>
            <p className="text-gray-700 mb-6">
              当サービスは、利用者から以下の情報を収集することがあります：
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>メールアドレス</li>
              <li>ユーザー名</li>
              <li>支払い情報（Stripe経由で安全に処理されます）</li>
              <li>サービス利用履歴</li>
              <li>IPアドレスおよびブラウザ情報</li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">2. 個人情報の利用目的</h3>
            <p className="text-gray-700 mb-6">
              収集した個人情報は以下の目的で利用します：
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>サービスの提供・運営</li>
              <li>ユーザーサポート</li>
              <li>利用料金の請求</li>
              <li>サービスの改善・新機能の開発</li>
              <li>重要なお知らせの送信</li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">3. 個人情報の第三者提供</h3>
            <p className="text-gray-700 mb-6">
              当サービスは、以下の場合を除き、個人情報を第三者に提供することはありません：
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要がある場合</li>
              <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">4. Cookie（クッキー）について</h3>
            <p className="text-gray-700 mb-6">
              当サービスは、ユーザーの利便性向上のためCookieを使用しています。
              Cookieにより収集された情報は、個人を特定するものではありません。
              ブラウザの設定によりCookieを無効にすることも可能ですが、その場合一部のサービスがご利用いただけない場合があります。
            </p>

            <h3 className="text-xl font-semibold mb-4">5. セキュリティ</h3>
            <p className="text-gray-700 mb-6">
              当サービスは、個人情報の紛失、破壊、改ざん及び漏洩などを防ぐため、適切なセキュリティ対策を実施しています。
              ただし、インターネット上での情報の送信は100%安全ではないことをご理解ください。
            </p>

            <h3 className="text-xl font-semibold mb-4">6. 個人情報の開示・訂正・削除</h3>
            <p className="text-gray-700 mb-6">
              ユーザーは、当サービスが保有する自己の個人情報の開示、訂正、削除を求めることができます。
              お問い合わせフォームよりご連絡ください。
            </p>

            <h3 className="text-xl font-semibold mb-4">7. プライバシーポリシーの変更</h3>
            <p className="text-gray-700 mb-6">
              当サービスは、必要に応じて本プライバシーポリシーを変更することがあります。
              変更後のプライバシーポリシーは、本ページに掲載した時点から効力を生じるものとします。
            </p>

            <h3 className="text-xl font-semibold mb-4">8. お問い合わせ</h3>
            <p className="text-gray-700 mb-6">
              本プライバシーポリシーに関するお問い合わせは、サービス内のお問い合わせフォームよりお願いいたします。
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