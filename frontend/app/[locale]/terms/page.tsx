'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function TermsPage() {
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
            {locale === 'ja' ? '利用規約' : 'Terms of Service'}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {locale === 'ja' ? '最終更新日: 2025年1月1日' : 'Last Updated: January 1, 2025'}
          </p>
        </div>

        {/* コンテンツ */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">
              {locale === 'ja' ? (
                <>本利用規約（以下「本規約」）は、Charactier（以下「当サービス」）が提供する
すべての機能の利用条件を定めるものです。ユーザーは本規約に同意のうえ
当サービスを利用するものとします。</>
              ) : (
                <>These Terms of Service (&quot;Terms&quot;) govern your use of all features provided by Charactier (&quot;Service&quot;). 
By using the Service, you agree to be bound by these Terms.</>
              )}
            </p>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '第1条（定義）' : 'Article 1 (Definitions)'}
            </h3>
            <div className="text-gray-700 mb-6">
              <p className="mb-2">
                {locale === 'ja' ? 
                  '1. 「トークチケット」とは、キャラクターとのチャット送信に必要なデジタルポイントをいいます。' :
                  '1. "Talk Tickets" refers to digital points required to send chat messages to characters.'
                }
              </p>
              <p>
                {locale === 'ja' ? 
                  '2. 「プレミアムキャラクター」とは、別途代金を支払うことで解放されるキャラクターをいいます。' :
                  '2. "Premium Characters" refers to characters unlocked by separate payment.'
                }
              </p>
            </div>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '第2条（アカウント）' : 'Article 2 (Account)'}
            </h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>
                {locale === 'ja' ? 
                  '登録時は最新かつ正確な情報を入力してください。' :
                  'Please provide current and accurate information during registration.'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  '同一人物による複数アカウントの作成は禁止します。' :
                  'Creating multiple accounts by the same person is prohibited.'
                }
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '第3条（禁止事項）' : 'Article 3 (Prohibited Activities)'}
            </h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>
                {locale === 'ja' ? 
                  '法令・公序良俗に反する行為' :
                  'Activities that violate laws or public order and morals'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  '第三者の権利を侵害する行為' :
                  'Activities that infringe on third-party rights'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  '生成 AI の応答内容を無断で転載・商用利用する行為' :
                  'Unauthorized reproduction or commercial use of AI-generated responses'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  'リバースエンジニアリング・スクレイピング等の不正アクセス行為' :
                  'Unauthorized access such as reverse engineering or scraping'
                }
              </li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '第4条（トークチケット）' : 'Article 4 (Talk Tickets)'}
            </h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>
                {locale === 'ja' ? 
                  'ユーザーは Stripe 決済によりトークチケットを購入できます。' :
                  'Users can purchase Talk Tickets through Stripe payment.'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  'トークチケットは譲渡・換金・返金できません。' :
                  'Talk Tickets cannot be transferred, exchanged for cash, or refunded.'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  'トークチケット残高は前払式支払手段（資金決済法）に準拠し管理します。' :
                  'Talk Ticket balance is managed in compliance with prepaid payment regulations.'
                }
              </li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '第5条（プレミアムキャラクター）' : 'Article 5 (Premium Characters)'}
            </h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>
                {locale === 'ja' ? 
                  'ユーザーが定められた代金を支払うことでプレミアムキャラクターを解放できます。' :
                  'Users can unlock Premium Characters by paying the designated fee.'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  '解放後は追加料金なくトークチケットを消費して会話可能です。' :
                  'After unlocking, users can chat using Talk Tickets without additional fees.'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  '解放権は譲渡・換金・返金できません。' :
                  'Unlock rights cannot be transferred, exchanged for cash, or refunded.'
                }
              </li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '第6条（生成 AI コンテンツの性質）' : 'Article 6 (Nature of AI-Generated Content)'}
            </h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>
                {locale === 'ja' ? 
                  '当サービスの応答は生成 AI により自動生成されるものであり、その正確性・合法性・有用性を保証しません。' :
                  'Service responses are automatically generated by AI, and we do not guarantee their accuracy, legality, or usefulness.'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  'AI 応答に起因するいかなる損害・トラブル・事件性についても、当サービスは一切の責任を負わないものとします。' :
                  'The Service assumes no responsibility for any damage, trouble, or incidents arising from AI responses.'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  'ユーザーは自己の判断と責任において AI 応答を利用してください。' :
                  'Users must use AI responses at their own judgment and responsibility.'
                }
              </li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '第7条（料金・返金）' : 'Article 7 (Fees and Refunds)'}
            </h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>
                {locale === 'ja' ? 
                  '支払方法はクレジットカード決済（Stripe）とします。' :
                  'Payment is made by credit card (Stripe).'
                }
              </li>
              <li className="font-bold">
                {locale === 'ja' ? 
                  'デジタル商品の特性上、購入済みのトークチケットおよびプレミアムキャラクターの代金は、いかなる理由でも返金いたしません。' :
                  'Due to the nature of digital goods, fees for purchased Talk Tickets and Premium Characters are non-refundable for any reason.'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  '月額プランが導入された場合、ユーザーは更新日前までにマイページで解約手続きを行うものとします。' :
                  'If a monthly plan is introduced, users must cancel through their account page before the renewal date.'
                }
              </li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '第8条（免責・損害賠償）' : 'Article 8 (Disclaimer and Damages)'}
            </h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>
                {locale === 'ja' ? 
                  '当サービスは天災・ネットワーク障害その他不可抗力によりサービスを提供できない場合、一切の責任を負いません。' :
                  'The Service assumes no responsibility for inability to provide service due to natural disasters, network failures, or other force majeure.'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  '当サービスの過失が軽微な場合、当サービスは利用に起因または関連してユーザーが被った損害について責任を負いません。' :
                  'In cases of minor negligence, the Service is not responsible for damages incurred by users in connection with use of the Service.'
                }
              </li>
              <li>
                {locale === 'ja' ? 
                  '当サービスが責任を負う場合でも、賠償額は当該ユーザーが過去 12 か月に当サービスへ支払った総額を上限とします。' :
                  'Even if the Service is liable, compensation is limited to the total amount paid by the user to the Service in the past 12 months.'
                }
              </li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '第9条（本規約の変更）' : 'Article 9 (Changes to Terms)'}
            </h3>
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">
              {locale === 'ja' ? (
                <>当サービスは必要に応じて本規約を変更できます。
変更後の規約は、本ページに掲示した時点で効力を生じます。</>
              ) : (
                <>The Service may change these Terms as necessary.
Changed Terms become effective when posted on this page.</>
              )}
            </p>

            <h3 className="text-xl font-semibold mb-4">
              {locale === 'ja' ? '第10条（準拠法・合意管轄）' : 'Article 10 (Governing Law and Jurisdiction)'}
            </h3>
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">
              {locale === 'ja' ? (
                <>本規約は日本法を準拠法とし、本サービスに関して紛争が生じた場合、
東京地方裁判所を第一審の専属的合意管轄裁判所とします。</>
              ) : (
                <>These Terms are governed by Japanese law, and in case of disputes regarding the Service,
the Tokyo District Court shall have exclusive jurisdiction for the first instance.</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}