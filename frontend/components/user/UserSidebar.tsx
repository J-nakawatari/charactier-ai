'use client';

import { 
  MessageSquare, 
  Users, 
  Heart, 
  Coins, 
  Settings, 
  LogOut,
  Menu,
  X,
  Home,
  ShoppingCart,
  History
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useState } from 'react';

interface UserSidebarProps {
  locale?: string;
}

export default function UserSidebar({ locale = 'ja' }: UserSidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = locale || params?.locale || 'ja';
  const [isOpen, setIsOpen] = useState(false);

  const sidebarItems = [
    { href: `/${currentLocale}`, icon: Home, label: 'ホーム' },
    { href: `/${currentLocale}/characters`, icon: Users, label: 'キャラクター一覧' },
    { href: `/${currentLocale}/chat`, icon: MessageSquare, label: 'チャット履歴' },
    { href: `/${currentLocale}/favorites`, icon: Heart, label: 'お気に入り' },
    { href: `/${currentLocale}/tokens`, icon: Coins, label: 'トークチケット購入' },
    { href: `/${currentLocale}/purchase-history`, icon: ShoppingCart, label: '購入履歴' },
    { href: `/${currentLocale}/settings`, icon: Settings, label: '設定' },
  ];

  return (
    <>
      {/* ハンバーガーメニューボタン（モバイル用） */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 p-3 bg-purple-600 text-white rounded-lg shadow-lg lg:hidden hover:bg-purple-700 transition-colors"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* オーバーレイ（モバイル用） */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* サイドバー */}
      <div className={`
        fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-100 
        flex flex-col shadow-sm overflow-y-auto transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Charactier</h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">AIキャラクターチャット</p>
        </div>

        {/* ユーザー情報 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-purple-600">U</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">ユーザー</p>
              <p className="text-xs text-gray-500">トークチケット: 30,000</p>
            </div>
          </div>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 p-4 space-y-1 min-h-0">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            メニュー
          </div>
          {sidebarItems.slice(0, 4).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-700' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-6">
            アカウント
          </div>
          {sidebarItems.slice(4).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-700' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200">
          <button className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 w-full transition-colors">
            <LogOut className="w-5 h-5 text-gray-400" />
            <span>ログアウト</span>
          </button>
        </div>
      </div>
    </>
  );
}