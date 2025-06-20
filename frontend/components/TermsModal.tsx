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
            <p className="text-gray-700 mb-6">
              本利用規約（以下「本規約」）は、Charactier（以下「当サービス」）が提供する
              すべての機能の利用条件を定めるものです。ユーザーは本規約に同意のうえ
              当サービスを利用するものとします。
            </p>

            <h3 className="text-xl font-semibold mb-4">第1条（定義）</h3>
            <div className="text-gray-700 mb-6">
              <p className="mb-2">1. 「トークチケット」とは、キャラクターとのチャット送信に必要なデジタルポイントをいいます。</p>
              <p>2. 「プレミアムキャラクター」とは、別途代金を支払うことで解放されるキャラクターをいいます。</p>
            </div>

            <h3 className="text-xl font-semibold mb-4">第2条（アカウント）</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>登録時は最新かつ正確な情報を入力してください。</li>
              <li>同一人物による複数アカウントの作成は禁止します。</li>
            </ul>

            <h3 className="text-xl font-semibold mb-4">第3条（禁止事項）</h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>法令・公序良俗に反する行為</li>
              <li>第三者の権利を侵害する行為</li>
              <li>生成 AI の応答内容を無断で転載・商用利用する行為</li>
              <li>リバースエンジニアリング・スクレイピング等の不正アクセス行為</li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">第4条（トークチケット）</h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>ユーザーは Stripe 決済によりトークチケットを購入できます。</li>
              <li>トークチケットは譲渡・換金・返金できません。</li>
              <li>トークチケット残高は前払式支払手段（資金決済法）に準拠し管理します。</li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">第5条（プレミアムキャラクター）</h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>ユーザーが定められた代金を支払うことでプレミアムキャラクターを解放できます。</li>
              <li>解放後は追加料金なくトークチケットを消費して会話可能です。</li>
              <li>解放権は譲渡・換金・返金できません。</li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">第6条（生成 AI コンテンツの性質）</h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>当サービスの応答は生成 AI により自動生成されるものであり、その正確性・合法性・有用性を保証しません。</li>
              <li>AI 応答に起因するいかなる損害・トラブル・事件性についても、当サービスは一切の責任を負わないものとします。</li>
              <li>ユーザーは自己の判断と責任において AI 応答を利用してください。</li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">第7条（料金・返金）</h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>支払方法はクレジットカード決済（Stripe）とします。</li>
              <li className="font-bold">デジタル商品の特性上、購入済みのトークチケットおよびプレミアムキャラクターの代金は、いかなる理由でも返金いたしません。</li>
              <li>月額プランが導入された場合、ユーザーは更新日前までにマイページで解約手続きを行うものとします。</li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">第8条（免責・損害賠償）</h3>
            <ol className="list-decimal pl-6 text-gray-700 mb-6">
              <li>当サービスは天災・ネットワーク障害その他不可抗力によりサービスを提供できない場合、一切の責任を負いません。</li>
              <li>当サービスの過失が軽微な場合、当サービスは利用に起因または関連してユーザーが被った損害について責任を負いません。</li>
              <li>当サービスが責任を負う場合でも、賠償額は当該ユーザーが過去 12 か月に当サービスへ支払った総額を上限とします。</li>
            </ol>

            <h3 className="text-xl font-semibold mb-4">第9条（本規約の変更）</h3>
            <p className="text-gray-700 mb-6">
              当サービスは必要に応じて本規約を変更できます。
              変更後の規約は、本ページに掲示した時点で効力を生じます。
            </p>

            <h3 className="text-xl font-semibold mb-4">第10条（準拠法・合意管轄）</h3>
            <p className="text-gray-700 mb-6">
              本規約は日本法を準拠法とし、本サービスに関して紛争が生じた場合、
              東京地方裁判所を第一審の専属的合意管轄裁判所とします。
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