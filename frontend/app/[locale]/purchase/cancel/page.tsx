'use client';

import { useRouter } from 'next/navigation';
import { XCircle, ArrowLeft, RotateCcw } from 'lucide-react';

export default function PurchaseCancelPage() {
  const router = useRouter();

  const handleBackToChat = () => {
    router.push('/ja/characters/3/chat');
  };

  const handleRetryPurchase = () => {
    router.push('/ja/characters/3/chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-yellow-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          購入がキャンセルされました
        </h2>
        
        <p className="text-gray-600 mb-8">
          トークチケットの購入がキャンセルされました。いつでも再度購入することができます。
        </p>
        
        <div className="space-y-3">
          <button
            onClick={handleRetryPurchase}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>再度購入する</span>
          </button>
          
          <button
            onClick={handleBackToChat}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>チャットに戻る</span>
          </button>
        </div>
      </div>
    </div>
  );
}