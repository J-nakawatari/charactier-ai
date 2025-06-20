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
            <p className="text-gray-700 mb-6">
              Charactier（以下「当サービス」）は、ユーザーの個人情報を適切に取り扱うため、
              以下のプライバシーポリシー（以下「本ポリシー」）を定めます。
            </p>

            <h3 className="text-xl font-semibold mb-4">1. 取得する情報</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>氏名・ニックネーム、メールアドレス</li>
              <li>決済情報（Stripeを通じて取得。カード番号は当サービスに保存しません）</li>
              <li>Cookie・端末識別子・アクセスログ</li>
              <li>チャット内容および生成 AI への入力プロンプト</li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">2. 利用目的</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>キャラクターとのチャット提供、トークチケット残高管理</li>
              <li>料金請求・決済処理</li>
              <li>利用状況の分析によるサービス改善</li>
              <li>法令・利用規約違反への対応</li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">3. 外部送信・Cookie 等の取扱い</h3>
            <p className="text-gray-700 mb-6">
              当サービスは利便性向上および利用状況の解析のため、
              Cookie や類似技術を用いて第三者サービスへ情報を送信します。
              ブラウザ設定で Cookie を無効にすると、一部機能が利用できない場合があります。
            </p>

            <div className="overflow-x-auto mb-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">送信先</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">送信される情報</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">利用目的</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">Google Analytics 4</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Cookie（_ga など）、IPアドレス、閲覧ページURL</td>
                    <td className="px-4 py-3 text-sm text-gray-700">アクセス解析</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">Stripe</td>
                    <td className="px-4 py-3 text-sm text-gray-700">決済金額、メールアドレス、決済トークン等</td>
                    <td className="px-4 py-3 text-sm text-gray-700">クレジットカード決済処理</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">Cloudflare</td>
                    <td className="px-4 py-3 text-sm text-gray-700">IPアドレス、User-Agent 等</td>
                    <td className="px-4 py-3 text-sm text-gray-700">サイト保護・パフォーマンス最適化</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm font-semibold text-gray-900 mb-2">オプトアウト方法</p>
              <p className="text-sm text-gray-700">
                GA4 の計測は <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-pink-500 underline hover:text-pink-600">Google Analytics オプトアウトアドオン</a> を
                利用することで無効化できます。その他 Cookie はブラウザ設定で削除／拒否が可能です。
              </p>
            </div>

            <h3 className="text-xl font-semibold mb-4">4. 第三者提供</h3>
            <p className="text-gray-700 mb-2">取得した個人情報は次の場合を除き第三者に提供しません。</p>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>決済業務委託のため Stripe へ提供する場合</li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">5. 個人情報の安全管理</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>通信は TLS により暗号化</li>
              <li>重要データはアクセス権限を最小限にした環境で管理</li>
              <li>社内ポリシーに基づくログ監査を実施</li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">6. 開示・訂正・削除の請求</h3>
            <p className="text-gray-700 mb-6">
              ユーザーは個人情報保護法に基づき、自己の個人情報の開示等を請求できます。<br />
              お問い合わせフォーム：<a href="https://forms.gle/ZkYUQSmpqxrQaa4m8" target="_blank" rel="noopener noreferrer" className="text-pink-500 underline hover:text-pink-600">https://forms.gle/ZkYUQSmpqxrQaa4m8</a>
            </p>

            <h3 className="text-xl font-semibold mb-4">7. 改定</h3>
            <p className="text-gray-700 mb-6">
              法令変更やサービス内容の変更に応じ、本ポリシーを改定することがあります。<br />
              最新の内容は本ページで公表します。
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