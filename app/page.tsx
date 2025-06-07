'use client';

import Link from 'next/link';
import { MessageSquare, Users, Coins, Star } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Charactier</h1>
            </div>
            
            <nav className="flex items-center space-x-8">
              <Link href="/characters" className="text-gray-600 hover:text-gray-900 transition-colors">
                キャラクター
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                料金
              </Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                ログイン
              </Link>
              <Link href="/register" className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                登録
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            AIキャラクターと<br />
            <span className="text-purple-600">特別な会話</span>を始めよう
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            様々な個性を持つAIキャラクターとチャットして、新しい体験を楽しんでください。
            会話を重ねるほど親密度が上がり、特別なコンテンツがアンロックされます。
          </p>
          
          <div className="flex justify-center space-x-4 mb-12">
            <Link href="/characters" className="bg-purple-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-purple-700 transition-colors">
              キャラクターを見る
            </Link>
            <Link href="/register" className="border border-purple-600 text-purple-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-purple-50 transition-colors">
              無料で始める
            </Link>
          </div>

          {/* 特徴 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">多様なキャラクター</h3>
              <p className="text-gray-600">
                様々な性格と背景を持つユニークなAIキャラクターが待っています
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">親密度システム</h3>
              <p className="text-gray-600">
                会話を重ねるほど親密度が上がり、特別なコンテンツがアンロックされます
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Coins className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">トークンシステム</h3>
              <p className="text-gray-600">
                手頃な価格でトークンを購入し、お気に入りのキャラクターとチャット
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}