'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-gray-900">
            {locale === 'ja' ? 'プライバシーポリシー' : 'Privacy Policy'}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {locale === 'ja' ? '最終改定日：2025-07-01' : 'Last Updated: July 1, 2025'}
          </p>
        </div>

        {/* コンテンツ */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">
              {locale === 'ja' ? (
                <>Charactier（以下「当サービス」）は、ユーザーの個人情報を適切に取り扱うため、
以下のプライバシーポリシー（以下「本ポリシー」）を定めます。</>
              ) : (
                <>Charactier (&quot;Service&quot;) establishes the following Privacy Policy (&quot;Policy&quot;) 
to properly handle users&apos; personal information.</>
              )}
            </p>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '1. 取得する情報' : '1. Information We Collect'}
            </h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>
                {locale === 'ja' ? 
                  '氏名・ニックネーム、メールアドレス' :
                  'Name/nickname, email address'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  '決済情報（Stripeを通じて取得。カード番号は当サービスに保存しません）' :
                  'Payment information (obtained through Stripe. Card numbers are not stored on our service)'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  'Cookie・端末識別子・アクセスログ' :
                  'Cookies, device identifiers, access logs'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  'チャット内容および生成 AI への入力プロンプト' :
                  'Chat content and input prompts to generative AI'
                }
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '2. 利用目的' : '2. Purpose of Use'}
            </h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>
                {locale === 'ja' ? 
                  'キャラクターとのチャット提供、トークチケット残高管理' :
                  'Providing character chat, managing Talk Ticket balance'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  '料金請求・決済処理' :
                  'Billing and payment processing'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  '利用状況の分析によるサービス改善' :
                  'Service improvement through usage analysis'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  '法令・利用規約違反への対応' :
                  'Response to violations of laws and terms of service'
                }
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '3. 外部送信・Cookie 等の取扱い' : '3. External Transmission and Cookie Handling'}
            </h3>
            <p className="text-gray-700 mb-4">
              {locale === 'ja' ? (
                <>当サービスは利便性向上および利用状況の解析のため、
Cookie や類似技術を用いて第三者サービスへ情報を送信します。
ブラウザ設定で Cookie を無効にすると、一部機能が利用できない場合があります。</>
              ) : (
                <>To improve convenience and analyze usage, our Service uses cookies and similar technologies 
to transmit information to third-party services. 
Disabling cookies in browser settings may prevent some features from working.</>
              )}
            </p>

            <div className="overflow-x-auto mb-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {locale === 'ja' ? '送信先' : 'Destination'}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {locale === 'ja' ? '送信される情報' : 'Information Transmitted'}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {locale === 'ja' ? '利用目的' : 'Purpose'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">Google Analytics 4</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {locale === 'ja' ? 
                        'Cookie（_ga など）、IPアドレス、閲覧ページURL' :
                        'Cookies (_ga etc.), IP address, page URLs'
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {locale === 'ja' ? 'アクセス解析' : 'Access analysis'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">Stripe</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {locale === 'ja' ? 
                        '決済金額、メールアドレス、決済トークン等' :
                        'Payment amount, email address, payment tokens etc.'
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {locale === 'ja' ? 'クレジットカード決済処理' : 'Credit card payment processing'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">Cloudflare</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {locale === 'ja' ? 
                        'IPアドレス、User-Agent 等' :
                        'IP address, User-Agent etc.'
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {locale === 'ja' ? 'サイト保護・パフォーマンス最適化' : 'Site protection and performance optimization'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                {locale === 'ja' ? 'オプトアウト方法' : 'Opt-out Methods'}
              </p>
              <p className="text-sm text-gray-700">
                {locale === 'ja' ? (
                  <>GA4 の計測は <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-pink-500 underline hover:text-pink-600">Google Analytics オプトアウトアドオン</a> を
利用することで無効化できます。その他 Cookie はブラウザ設定で削除／拒否が可能です。</>
                ) : (
                  <>GA4 tracking can be disabled by using the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-pink-500 underline hover:text-pink-600">Google Analytics Opt-out Add-on</a>. 
Other cookies can be deleted/rejected through browser settings.</>
                )}
              </p>
            </div>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '4. 第三者提供' : '4. Third-Party Disclosure'}
            </h3>
            <p className="text-gray-700 mb-2">
              {locale === 'ja' ? 
                '取得した個人情報は次の場合を除き第三者に提供しません。' :
                'We do not provide personal information to third parties except in the following cases:'
              }
            </p>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>
                {locale === 'ja' ? 'ユーザーの同意がある場合' : 'With user consent'}
              </li>
              <li>
                {locale === 'ja' ? '法令に基づく場合' : 'As required by law'}
              </li>
              <li>
                {locale === 'ja' ? '決済業務委託のため Stripe へ提供する場合' : 'When providing to Stripe for payment processing'}
              </li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '5. 個人情報の安全管理' : '5. Security of Personal Information'}
            </h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>
                {locale === 'ja' ? '通信は TLS により暗号化' : 'Communications are encrypted with TLS'}
              </li>
              <li>
                {locale === 'ja' ? 
                  '重要データはアクセス権限を最小限にした環境で管理' :
                  'Important data is managed in an environment with minimal access rights'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  '社内ポリシーに基づくログ監査を実施' :
                  'Log audits based on internal policies'
                }
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '6. 開示・訂正・削除の請求' : '6. Requests for Disclosure, Correction, and Deletion'}
            </h3>
            <p className="text-gray-700 mb-6">
              {locale === 'ja' ? (
                <>ユーザーは個人情報保護法に基づき、自己の個人情報の開示等を請求できます。<br />
お問い合わせフォーム：<a href="https://forms.gle/ZkYUQSmpqxrQaa4m8" target="_blank" rel="noopener noreferrer" className="text-pink-500 underline hover:text-pink-600">https://forms.gle/ZkYUQSmpqxrQaa4m8</a></>
              ) : (
                <>Users can request disclosure of their personal information based on personal information protection laws.<br />
Contact form: <a href="https://forms.gle/ZkYUQSmpqxrQaa4m8" target="_blank" rel="noopener noreferrer" className="text-pink-500 underline hover:text-pink-600">https://forms.gle/ZkYUQSmpqxrQaa4m8</a></>
              )}
            </p>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '7. 改定' : '7. Amendments'}
            </h3>
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">
              {locale === 'ja' ? (
                <>法令変更やサービス内容の変更に応じ、本ポリシーを改定することがあります。
最新の内容は本ページで公表します。</>
              ) : (
                <>This Policy may be amended in response to changes in laws or service content.
The latest version will be published on this page.</>
              )}
            </p>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '8. お問い合わせ' : '8. Contact Information'}
            </h3>
            <p className="text-gray-700 mb-6">
              {locale === 'ja' ? (
                <>個人情報の取り扱いに関するお問い合わせは以下までお願いします。<br />
Charactier運営事務局<br />
Email: support@charactier-ai.com<br />
お問い合わせフォーム：<a href="https://forms.gle/ZkYUQSmpqxrQaa4m8" target="_blank" rel="noopener noreferrer" className="text-pink-500 underline hover:text-pink-600">https://forms.gle/ZkYUQSmpqxrQaa4m8</a></>
              ) : (
                <>For inquiries about the handling of personal information, please contact:<br />
Charactier Operations<br />
Email: support@charactier-ai.com<br />
Contact form: <a href="https://forms.gle/ZkYUQSmpqxrQaa4m8" target="_blank" rel="noopener noreferrer" className="text-pink-500 underline hover:text-pink-600">https://forms.gle/ZkYUQSmpqxrQaa4m8</a></>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}