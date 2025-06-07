import Link from 'next/link';
import { MessageSquare, Users, Shield } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Charactier AI
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AIキャラクターとの特別な会話体験
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/admin/dashboard"
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              管理者ダッシュボード
            </Link>
            <Link
              href="/characters"
              className="bg-white text-purple-600 border border-purple-600 px-6 py-3 rounded-lg hover:bg-purple-50 transition-colors font-medium"
            >
              キャラクター一覧
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <MessageSquare className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">AIチャット</h3>
            <p className="text-gray-600">
              個性豊かなキャラクターとリアルタイムで会話
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <Users className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">親密度システム</h3>
            <p className="text-gray-600">
              会話を重ねて関係を深め、特別なコンテンツを解放
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <Shield className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">安全・安心</h3>
            <p className="text-gray-600">
              セキュアな環境でプライベートな会話を保護
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}