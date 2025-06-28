'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function LegalPage() {
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
            {locale === 'ja' ? '特定商取引法に基づく表記' : 'Legal Information'}
          </h1>
        </div>

        {/* コンテンツ */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <table className="w-full">
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-4 text-sm font-medium text-gray-900 w-1/3 align-top">
                  {locale === 'ja' ? '販売業者' : 'Seller'}
                </td>
                <td className="py-4 text-sm text-gray-700">Charactier</td>
              </tr>
              
              <tr>
                <td className="py-4 text-sm font-medium text-gray-900 align-top">
                  {locale === 'ja' ? '運営責任者' : 'Representative'}
                </td>
                <td className="py-4 text-sm text-gray-700">
                  {locale === 'ja' ? '運営責任者' : 'Representative Name'}
                </td>
              </tr>
              
              <tr>
                <td className="py-4 text-sm font-medium text-gray-900 align-top">
                  {locale === 'ja' ? '所在地' : 'Address'}
                </td>
                <td className="py-4 text-sm text-gray-700">
                  {locale === 'ja' ? (
                    <>
                      〒000-0000<br />
                      東京都〇〇区〇〇
                    </>
                  ) : (
                    'Tokyo, Japan'
                  )}
                </td>
              </tr>
              
              <tr>
                <td className="py-4 text-sm font-medium text-gray-900 align-top">
                  {locale === 'ja' ? '電話番号' : 'Phone'}
                </td>
                <td className="py-4 text-sm text-gray-700">
                  {locale === 'ja' ? 
                    'お問い合わせはメールにてお願いいたします' : 
                    'Please contact us by email'
                  }
                </td>
              </tr>
              
              <tr>
                <td className="py-4 text-sm font-medium text-gray-900 align-top">
                  {locale === 'ja' ? 'メールアドレス' : 'Email'}
                </td>
                <td className="py-4 text-sm text-gray-700">support@charactier-ai.com</td>
              </tr>
              
              <tr>
                <td className="py-4 text-sm font-medium text-gray-900 align-top">
                  {locale === 'ja' ? '販売価格' : 'Price'}
                </td>
                <td className="py-4 text-sm text-gray-700">
                  {locale === 'ja' ? '各商品ページに表示' : 'As displayed on each product page'}<br />
                  <span className="text-xs text-gray-500">
                    {locale === 'ja' ? '※すべて税込価格' : '※All prices include tax'}
                  </span>
                </td>
              </tr>
              
              <tr>
                <td className="py-4 text-sm font-medium text-gray-900 align-top">
                  {locale === 'ja' ? '商品代金以外の必要料金' : 'Additional Fees'}
                </td>
                <td className="py-4 text-sm text-gray-700">
                  {locale === 'ja' ? 'なし' : 'None'}
                </td>
              </tr>
              
              <tr>
                <td className="py-4 text-sm font-medium text-gray-900 align-top">
                  {locale === 'ja' ? '支払方法' : 'Payment Method'}
                </td>
                <td className="py-4 text-sm text-gray-700">
                  {locale === 'ja' ? 'クレジットカード決済（Stripe）' : 'Credit Card (Stripe)'}<br />
                  <span className="text-xs text-gray-500">
                    {locale === 'ja' ? 
                      '※対応カード: Visa, Mastercard, American Express, JCB' :
                      '※Supported: Visa, Mastercard, American Express, JCB'
                    }
                  </span>
                </td>
              </tr>
              
              <tr>
                <td className="py-4 text-sm font-medium text-gray-900 align-top">
                  {locale === 'ja' ? '支払時期' : 'Payment Timing'}
                </td>
                <td className="py-4 text-sm text-gray-700">
                  {locale === 'ja' ? 
                    '購入手続き完了時に即時決済' : 
                    'Immediate payment upon completion of purchase'
                  }
                </td>
              </tr>
              
              <tr>
                <td className="py-4 text-sm font-medium text-gray-900 align-top">
                  {locale === 'ja' ? '商品の引渡時期' : 'Delivery Time'}
                </td>
                <td className="py-4 text-sm text-gray-700">
                  {locale === 'ja' ? 
                    '決済完了後、即時利用可能' : 
                    'Available immediately after payment'
                  }
                </td>
              </tr>
              
              <tr>
                <td className="py-4 text-sm font-medium text-gray-900 align-top">
                  {locale === 'ja' ? '返品・交換について' : 'Returns & Exchanges'}
                </td>
                <td className="py-4 text-sm text-gray-700">
                  {locale === 'ja' ? 
                    'デジタルコンテンツの性質上、返品・交換はお受けできません' : 
                    'Due to the nature of digital content, returns and exchanges are not accepted'
                  }
                </td>
              </tr>
              
              <tr>
                <td className="py-4 text-sm font-medium text-gray-900 align-top">
                  {locale === 'ja' ? '動作環境' : 'System Requirements'}
                </td>
                <td className="py-4 text-sm text-gray-700">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">
                        {locale === 'ja' ? '推奨ブラウザ:' : 'Recommended Browsers:'}
                      </span><br />
                      • Chrome ({locale === 'ja' ? '最新版' : 'latest'})<br />
                      • Firefox ({locale === 'ja' ? '最新版' : 'latest'})<br />
                      • Safari ({locale === 'ja' ? '最新版' : 'latest'})<br />
                      • Edge ({locale === 'ja' ? '最新版' : 'latest'})
                    </div>
                    <div>
                      <span className="font-medium">
                        {locale === 'ja' ? '推奨環境:' : 'Requirements:'}
                      </span><br />
                      • {locale === 'ja' ? 'インターネット接続必須' : 'Internet connection required'}<br />
                      • {locale === 'ja' ? 'JavaScript有効化必須' : 'JavaScript must be enabled'}
                    </div>
                  </div>
                </td>
              </tr>
              
              <tr>
                <td className="py-4 text-sm font-medium text-gray-900 align-top">
                  {locale === 'ja' ? 'サービス内容' : 'Service Description'}
                </td>
                <td className="py-4 text-sm text-gray-700">
                  {locale === 'ja' ? (
                    <>
                      AIキャラクターとのチャットサービスの提供<br />
                      • トークチケット（チャット利用権）の販売<br />
                      • プレミアムキャラクター（追加キャラクター）の販売
                    </>
                  ) : (
                    <>
                      AI character chat service<br />
                      • Talk tickets (chat usage rights)<br />
                      • Premium characters (additional characters)
                    </>
                  )}
                </td>
              </tr>
              
              <tr>
                <td className="py-4 text-sm font-medium text-gray-900 align-top">
                  {locale === 'ja' ? '注意事項' : 'Important Notes'}
                </td>
                <td className="py-4 text-sm text-gray-700">
                  {locale === 'ja' ? (
                    <>
                      • 本サービスはエンターテインメント目的です<br />
                      • AI生成コンテンツの正確性は保証されません<br />
                      • 13歳未満の方はご利用いただけません<br />
                      • 未成年者は保護者の同意が必要です
                    </>
                  ) : (
                    <>
                      • This service is for entertainment purposes<br />
                      • Accuracy of AI-generated content is not guaranteed<br />
                      • Users must be 13 years or older<br />
                      • Minors require parental consent
                    </>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}