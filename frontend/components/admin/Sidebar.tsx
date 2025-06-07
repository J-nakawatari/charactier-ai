'use client';

import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Coins, 
  Bell, 
  Settings, 
  Shield, 
  BarChart3,
  LogOut 
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sidebarItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'ダッシュボード' },
  { href: '/admin/users', icon: Users, label: 'ユーザー管理' },
  { href: '/admin/characters', icon: MessageSquare, label: 'キャラクター管理' },
  { href: '/admin/tokens', icon: Coins, label: 'トークン管理' },
  { href: '/admin/notifications', icon: Bell, label: '通知管理' },
  { href: '/admin/analytics', icon: BarChart3, label: 'アナリティクス' },
  { href: '/admin/security', icon: Shield, label: 'セキュリティ' },
  { href: '/admin/settings', icon: Settings, label: '設定' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm overflow-y-auto">
      {/* ヘッダー */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Charactier</h1>
        </div>
        <p className="text-sm text-gray-400 mt-1">管理者だっしゅぼーど</p>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 p-4 space-y-1 min-h-0">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          一般
        </div>
        {sidebarItems.slice(0, 4).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
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
          ツール
        </div>
        {sidebarItems.slice(4).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
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
  );
}